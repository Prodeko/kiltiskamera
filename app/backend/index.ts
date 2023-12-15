import { RawData, WebSocketServer, WebSocket } from "ws";
import express, { Express, NextFunction, Request, Response } from "express";
import crypto from "crypto";
import passport from "passport";
import OAuth2Strategy from "passport-oauth2";
import path from "path";
import session from "express-session";
import cookieParser from "cookie-parser";
import request from "request";
import http from "http";
const tokenValidityPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds

interface TokenInfo {
  id: string;
  displayName: string;
  timestamp: number;
}
interface ProdekoUser {
  id: string;
  email: string;
  displayName: string;
}

const onlineTokens: Record<string, TokenInfo> = {};

function generateRandomToken(): string {
  // Generate a random buffer
  const buffer = crypto.randomBytes(32);

  // Convert the buffer to a hexadecimal string
  const randomString = buffer.toString("hex");

  return randomString;
}

function addOnlineToken(user: ProdekoUser): string {
  const token = generateRandomToken();
  onlineTokens[token] = {
    id: user.id,
    displayName: user.displayName,
    timestamp: Date.now(),
  };
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

app.get("/authenticate", (req: Request, res: Response) => {
  // This endpoint will be called from nginx auth_request module
  // requests might be cached.
  const { token } = req.query;

  if (typeof token !== "string") {
    res
      .json({ error: "Query param 'token' has to be of type string" })
      .status(400);
  } else {
    console.log("got auth req");
    console.log(token);

    if (isTokenOnline(token)) {
      res.send(200);
    } else {
      res.send(401);
    }
  }
});

app.use(cookieParser());
const sessionParser = session({
  secret: "YOUR_SESSION_SECRET",
  resave: false,
  saveUninitialized: false,
});

app.use(sessionParser);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: ProdekoUser, done) => {
  console.log(user);
  done(null, user);
});
passport.use(
  new OAuth2Strategy(
    {
      authorizationURL: "http://localhost:8000/oauth2/auth",
      tokenURL: "http://localhost:8000/oauth2/token",
      clientID: "g3e8ssUHI0QKZeyJF0dkIDeKfUWcoNEBtzU10C1Q",
      clientSecret:
        "Q5pMhYXRfcqfFJwmfkpOY4qBvojSBir3wUrPb5829PNwaJ1jP72oFyGYNu2CPEkz0ATU50vxWTTuUHQfs2fHAFAVnGjqWshBrTpPSqVPfz7tBkXSNu2nXR5cZ8gftN9N",
      callbackURL: "http://localhost:8087/auth/google/callback",
      // eslint-disable-next-line @typescript-eslint/ban-types
    },
    (
      accessToken: string,
      refreshToken: string,
      profile: string,
      done: Function
    ) => {
      // handle the user profile
      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      // Get user details
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const userResponse = request(
        "http://localhost:8000/oauth2/user_details/",
        {
          method: "GET",
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
            pk,
            email,
            first_name,
            last_name, // has_accepted_policies,
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
        }
      );
    }
  )
);

app.get(
  "/auth/google/callback",
  passport.authenticate("oauth2", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

app.get("/login", (req, res) => {
  res.send(`
    <html>
      <body>
        <a href="/auth/google">Sign in with Google</a>
      </body>
    </html>
  `);
});

// Middleware to check if the user is authenticated
const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.isAuthenticated()) {
    return next();
  }
  // If not authenticated, redirect to Google authentication
  return res.redirect("/auth/google");
};
app.get("/auth/google", passport.authenticate("oauth2"));

// Serve static files from the 'frontend/build' directory
// app.use(express.static(path.join(__dirname, '../frontend/build')));

// For any other routes, serve the React app
// app.get('*', (req, res) => {
//  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
// });

app.use(
  ensureAuthenticated,
  express.static(path.join(__dirname, "../frontend/build"))
);

app.get("/stream_url", ensureAuthenticated, (req: Request, res: Response) => {
  // This endpoint will be called from frontend
  res.set("Access-Control-Allow-Origin", "*"); // TODO cleanup
  const user = req.user as ProdekoUser;
  console.log("stream user", req.user);
  const token = addOnlineToken(user);

  console.log("got stream url name");
  const m3u8StreamSource = `https://kiltiskamera.prodeko.org/live/hls/${token}/stream.m3u8`;

  res.json({ url: m3u8StreamSource });
});

app.get("/viewers", ensureAuthenticated, (req: Request, res: Response) => {
  // This endpoint returns the current viewers of the stream

  console.log("got viewer req");

  const tokens = getOnlineTokens();
  res.json({
    viewers: Object.keys(tokens).map((token) => tokens[token].displayName),
  });
});

const http_app = http.createServer();
const wss = new WebSocket.Server({
  noServer: true,
});

type ChatMessage = {
  timestamp: string;
  text: string;
};

enum WsMessageType {
  MESSAGE = "MESSAGE",
  INIT_ALL = "ALL",
}

const MESSAGE_TIME_TO_LIVE = 1 * 60 * 1000; // 1 minute
const MAX_MESSAGES = 50;

let messages: ChatMessage[] = [];

const sendToClients = (clients: Set<WebSocket>, data: string) => {
  clients.forEach((s) => {
    s.send(data);
  });
};

const filterMessagesJob = (
  _messages: ChatMessage[],
  clients: Set<WebSocket>
) => {
  const threshold = Date.now() - MESSAGE_TIME_TO_LIVE;
  messages = _messages
    .filter((m) => new Date(m.timestamp).getTime() > threshold)
    .slice(0, MAX_MESSAGES);
  const msgData = JSON.stringify({
    type: WsMessageType.MESSAGE,
    data: messages,
  });
  sendToClients(clients, msgData);
};

const addNewMessage = (data: RawData, user: ProdekoUser) => {
  const { text } = JSON.parse(data.toString());
  if (!text) {
    throw new Error("Invalid message");
  }

  const timestamp = new Date().toJSON();
  const msg = {
    timestamp,
    text,
    sender: user.displayName,
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

const handleWsMessage = (
  data: RawData,
  user: ProdekoUser,
  clients: Set<WebSocket>
) => {
  addNewMessage(data, user);
  const msgData = JSON.stringify({
    type: WsMessageType.MESSAGE,
    data: messages,
  });
  sendToClients(clients, msgData);
  setTimeout(() => filterMessagesJob(messages, clients), MESSAGE_TIME_TO_LIVE);
};

wss.on("connection", function (socket: any, wsUser: ProdekoUser) {
  console.log(`Client ${wsUser.displayName} connected to the WebSocket`);
  handleConnect(socket);

  socket.on("message", (data: any) => {
    try {
      handleWsMessage(data, wsUser, wss.clients);
    } catch (err) {
      console.log("Invalid message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Define a custom session interface that extends SessionData
declare module "express-session" {
  interface SessionData {
    passport?: {
      user?: ProdekoUser; // Adjust the type based on your actual structure
    };
  }
}

// Upgrade request handler for WebSocket connections
http_app.on("upgrade", (request, socket, head) => {
  // Use the session middleware to parse the session
  const sessionRequest = request as Request;
  sessionParser(sessionRequest, {} as Response, () => {
    if (!sessionRequest.session.passport || !sessionRequest.session) {
      // Handle unauthorized upgrade
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    } else {
      const wsUser = sessionRequest.session.passport.user;
      console.log("WebSocket upgrade");
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, wsUser);
      });
    }
  });
});

http_app.listen(port, "0.0.0.0", function () {
  console.log(
    `⚡️[server]: Authentication server is running at http://localhost:${port}`
  );
});
http_app.on("request", app);
