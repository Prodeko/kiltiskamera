import { RawData, WebSocketServer, WebSocket } from 'ws';
import express, { Express, Request, Response } from 'express';
import crypto from 'crypto';

const userId = "dooku"; // need to be changed after auth integration
const tokenValidityPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds

interface TokenInfo {
  userId: string;
  timestamp: number;
}

const onlineTokens: Record<string, TokenInfo> = {};

function generateRandomToken(): string {
  // Generate a random buffer
  const buffer = crypto.randomBytes(32);

  // Convert the buffer to a hexadecimal string
  const randomString = buffer.toString('hex');

  return randomString;
}

function addOnlineToken(userId: string): string {
  const token = generateRandomToken();
  onlineTokens[token] = { userId, timestamp: Date.now() };
  return token;
}

function isTokenOnline(token: string): boolean {
  return !!onlineTokens[token];
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
app.use(express.json())


app.get('/authenticate', (req: Request, res: Response) => {
  // This endpoint will be called from nginx auth_request module
  // requests might be cached.
  const {token} = req.query;

  if (typeof token !== "string") {
    res.json({"error": "Query param 'token' has to be of type string"}).status(400);
  }
  else {

    console.log("got auth req");
    console.log(token);

    if (isTokenOnline(token)) {
      res.send(200);
    }
    else {
      res.send(401);
    }
  }
});

app.get('/stream_url', (req: Request, res: Response) => {
  // This endpoint will be called from frontend
  res.set('Access-Control-Allow-Origin', '*'); // TODO cleanup

  var token = addOnlineToken(userId);
  
  console.log("got stream url name");
  const m3u8_stream_source = "https://kiltiskamera.prodeko.org/live/hls/"+token+"/stream.m3u8"

  res.json({'url': m3u8_stream_source});
});




app.listen(port, () => {
  console.log(`⚡️[server]: Authentication server is running at http://localhost:${port}`);
});

const wss = new WebSocketServer({
  port: 8080,
});

type ChatMessage = {
  timestamp: string,
  text: string
};

enum WsMessageType {
  MESSAGE = 'MESSAGE',
  INIT_ALL = 'ALL',
}

const messages: ChatMessage[] = [];

const addNewMessage = (data: RawData) => {
  const { text } = JSON.parse(data.toString());
  if (!text) {
    throw new Error('Invalid message');
  }

  const timestamp = new Date().toJSON();
  const msg = { timestamp, text } as ChatMessage;
  messages.push(msg);
  return msg;
};

const handleConnect = (socket: WebSocket) => {
  const data = JSON.stringify(
    {
      type: WsMessageType.INIT_ALL,
      data: messages,
    },
  );
  socket.send(data);
};

const handleWsMessage = (data: RawData, clients: Set<WebSocket>) => {
  const msg = addNewMessage(data);
  clients.forEach((s) => {
    const msgData = JSON.stringify({
      type: WsMessageType.MESSAGE,
      data: messages,
    });
    console.log(`Received message: "${msg.text}"`);
    s.send(msgData);
  });
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
