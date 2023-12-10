import { RawData, WebSocketServer, WebSocket } from 'ws';
import express, {
  Express, NextFunction, Request, Response,
} from 'express';
import crypto from 'crypto';
import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import path from 'path';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import request from 'request';

const tokenValidityPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds

interface TokenInfo {
  id: string;
  displayName: string;
  timestamp: number;
}
interface ProdekoUser {
  id: string
  email: string
  displayName: string
}

const onlineTokens: Record<string, TokenInfo> = {};

function generateRandomToken(): string {
  // Generate a random buffer
  const buffer = crypto.randomBytes(32);

  // Convert the buffer to a hexadecimal string
  const randomString = buffer.toString('hex');

  return randomString;
}

function addOnlineToken(user: ProdekoUser): string {
  const token = generateRandomToken();
  onlineTokens[token] = { id: user.id, displayName: user.displayName, timestamp: Date.now() };
  return token;
}

function isTokenOnline(token: string): boolean {
  return !!onlineTokens[token];
}

function getOnlineTokens() {
  return onlineTokens;
}

function removeExpiredTokens(): void {
  const currentTime = Date.now();
  const expirationTime = tokenValidityPeriod;

  Object.keys(onlineTokens).forEach((token) => {
    const tokenInfo = onlineTokens[token];
    if (currentTime - tokenInfo.timestamp > expirationTime) {
      delete onlineTokens[token];
    }
  });

  // Schedule the next cleanup after 5 minutes
  setTimeout(removeExpiredTokens, expirationTime);
}

// Call the cleanup function to start the periodic cleanup
removeExpiredTokens();

const app: Express = express();
const port = 8087;
app.use(express.json());

app.get('/authenticate', (req: Request, res: Response) => {
  // This endpoint will be called from nginx auth_request module
  // requests might be cached.
  const { token } = req.query;

  if (typeof token !== 'string') {
    res
      .json({ error: "Query param 'token' has to be of type string" })
      .status(400);
  } else {
    console.log('got auth req');
    console.log(token);

    if (isTokenOnline(token)) {
      res.send(200);
    } else {
      res.send(401);
    }
  }
});

app.use(cookieParser());
app.use(session({ secret: 'YOUR_SESSION_SECRET', resave: false, saveUninitialized: false }));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: ProdekoUser, done) => {
  done(null, user);
});
passport.use(new OAuth2Strategy({
  authorizationURL: 'http://localhost:8000/oauth2/auth',
  tokenURL: 'http://localhost:8000/oauth2/token',
  clientID: 'BlnkyR4JOOBTvtWGZYnF5KxtILfa2sbGL8fcqAD4',
  clientSecret: 'SZsrN847Rg36OLlJ3GPQEvEplf3qPibtYIATcz3xTwyL6pZZr67QlMGNafE5Xw7Dvs7ATjFONBFazMtOJr5WxOcdLA5iX5DMhm59i1xdu3ywOKWutjG6GrdBpv4IeYOa',
  callbackURL: 'http://localhost:8087/auth/google/callback',
// eslint-disable-next-line @typescript-eslint/ban-types
}, (accessToken: string, refreshToken: string, profile: string, done: Function) => {
  // handle the user profile
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  // Get user details
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const userResponse = request(
    'http://localhost:8000/oauth2/user_details/',
    {
      method: 'GET',
      headers,
      json: true,
      // https: {
      //  rejectUnauthorized: !isDevOrTest,
      // },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (error: any, response: any, body: any) => {
      const {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        pk, email, first_name, last_name, // has_accepted_policies,
      } = response.body;

      // if (!has_accepted_policies) {
      //  const e = new Error(
      //    `You have not accepted Prodeko's privacy policy.
      // Please accept our privacy policy in order to use the site while logged in.
      // You may accept the policy by logging in via https://prodeko.org/login,
      // and clicking 'I agree' on the displayed prompt.`.replace(/\n/g, " ")
      // )
      // e["code"] = "PRPOL"
      // throw e
      // }
      done(null, {
        id: pk,
        displayName: `${first_name} ${last_name}`,
        email,
      });
    },
  );
}));

app.get('/auth/google/callback', passport.authenticate('oauth2', {
  successRedirect: '/',
  failureRedirect: '/login',
}));

app.get('/login', (req, res) => {
  res.send(`
    <html>
      <body>
        <a href="/auth/google">Sign in with Google</a>
      </body>
    </html>
  `);
});

// Middleware to check if the user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  // If not authenticated, redirect to Google authentication
  return res.redirect('/auth/google');
};
app.get('/auth/google', passport.authenticate('oauth2'));

// Serve static files from the 'frontend/build' directory
// app.use(express.static(path.join(__dirname, '../frontend/build')));

// For any other routes, serve the React app
// app.get('*', (req, res) => {
//  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
// });

app.use(ensureAuthenticated, express.static(path.join(__dirname, '../frontend/build')));

app.get('/stream_url', ensureAuthenticated, (req: Request, res: Response) => {
  // This endpoint will be called from frontend
  res.set('Access-Control-Allow-Origin', '*'); // TODO cleanup
  const user = req.user as ProdekoUser;
  console.log('stream user', req.user);
  const token = addOnlineToken(user);

  console.log('got stream url name');
  const m3u8StreamSource = `https://kiltiskamera.prodeko.org/live/hls/${token}/stream.m3u8`;

  res.json({ url: m3u8StreamSource });
});

app.get('/viewers', ensureAuthenticated, (req: Request, res: Response) => {
  // This endpoint returns the current viewers of the stream

  console.log('got viewer req');

  const tokens = getOnlineTokens();
  res.json({ viewers: Object.keys(tokens).map((token) => tokens[token].displayName) });
});

app.listen(port, () => {
  console.log(
    `⚡️[server]: Authentication server is running at http://localhost:${port}`,
  );
});

const wss = new WebSocketServer({
  port: 8080,
});

type ChatMessage = {
  timestamp: string;
  text: string;
};

enum WsMessageType {
  MESSAGE = 'MESSAGE',
  INIT_ALL = 'ALL',
}

const MESSAGE_TIME_TO_LIVE = 1 * 60 * 1000; // 1 minute
const MAX_MESSAGES = 50;

let messages: ChatMessage[] = [];

// TODO: save a name for each user
// when the user connects.
// Used for displaying the name in the chat
const PLACEHOLDER_NAME = 'Aleks Hiiho';
const getNameForUser = () => PLACEHOLDER_NAME;

const sendToClients = (clients: Set<WebSocket>, data: string) => {
  clients.forEach((s) => {
    s.send(data);
  });
};

const filterMessagesJob = (_messages: ChatMessage[], clients: Set<WebSocket>) => {
  const threshold = Date.now() - MESSAGE_TIME_TO_LIVE;
  messages = _messages.filter(
    (m) => new Date(m.timestamp).getTime() > threshold,
  ).slice(0, MAX_MESSAGES);
  const msgData = JSON.stringify({
    type: WsMessageType.MESSAGE,
    data: messages,
  });
  sendToClients(clients, msgData);
};

const addNewMessage = (data: RawData) => {
  const { text } = JSON.parse(data.toString());
  if (!text) {
    throw new Error('Invalid message');
  }

  const timestamp = new Date().toJSON();
  const msg = {
    timestamp,
    text,
    sender: getNameForUser(),
  } as ChatMessage;

  messages.push(msg);
  return msg;
};

const handleConnect = (socket: WebSocket) => {
  const data = JSON.stringify({
    type: WsMessageType.INIT_ALL,
    data: messages,
  });
  socket.send(data);
};

const handleWsMessage = (data: RawData, clients: Set<WebSocket>) => {
  addNewMessage(data);
  const msgData = JSON.stringify({
    type: WsMessageType.MESSAGE,
    data: messages,
  });
  sendToClients(clients, msgData);
  setTimeout(() => filterMessagesJob(messages, clients), MESSAGE_TIME_TO_LIVE);
};

const start = () => {
  wss.on('connection', (socket) => {
    handleConnect(socket);

    socket.on('message', (data) => {
      try {
        handleWsMessage(data, wss.clients);
      } catch (err) {
        console.log('Invalid message:', err);
      }
    });
  });
};

start();
