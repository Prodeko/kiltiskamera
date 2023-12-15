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
import { ensureAuthenticated } from "./auth";
import { handleConnect, handleWsMessage } from "./websocket";
import {
  isTokenOnline,
  ProdekoUser,
  addOnlineToken,
  getOnlineTokens,
} from "./tokens";
import { PORT } from "./configuration";

// Setup express app and middlewares
const app: Express = express();
app.use(express.json());

app.use(cookieParser());
const sessionParser = session({
  secret: "YOUR_SESSION_SECRET",
  resave: false,
  saveUninitialized: false,
});

app.use(sessionParser);

app.use(passport.initialize());
app.use(passport.session());

// Authentication routes
app.get("/auth/prodeko", passport.authenticate("oauth2"));
app.get(
  "/auth/prodeko/callback",
  passport.authenticate("oauth2", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

// Login route
app.get("/login", (req, res) => {
  res.send(`
    <html>
      <body>
        <a href="/auth/prodeko">Sign in with Prodeko</a>
      </body>
    </html>
  `);
});

// All frontend routes
app.use(
  ensureAuthenticated,
  express.static(path.join(__dirname, "../../frontend/build"))
);

// Stream publisher routes
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

// Web app routes
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

// Lower level section
// Setup HTTP and WS servers
const http_server = http.createServer();
const ws_server = new WebSocket.Server({
  noServer: true,
});

// Web socket handlers
ws_server.on("connection", function (socket: any, wsUser: ProdekoUser) {
  console.log(`Client ${wsUser.displayName} connected to the WebSocket`);
  handleConnect(socket);

  socket.on("message", (data: any) => {
    try {
      handleWsMessage(data, wsUser, ws_server.clients);
    } catch (err) {
      console.log("Invalid message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Lower level HTTP server routes
http_server.on("upgrade", (request, socket, head) => {
  // Websocket connections start with a HTTP "upgrade" request,
  // which we leverage to inject the session info.
  const sessionRequest = request as Request;
  // Use the session middleware to parse the session
  sessionParser(sessionRequest, {} as Response, () => {
    if (!sessionRequest.session.passport || !sessionRequest.session) {
      // Handle unauthorized upgrade
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    } else {
      const wsUser = sessionRequest.session.passport.user;
      console.log("WebSocket upgrade");
      ws_server.handleUpgrade(request, socket, head, (ws) => {
        ws_server.emit("connection", ws, wsUser);
      });
    }
  });
});

// Send all rest HTTP traffic to Express
http_server.on("request", app);
http_server.listen(PORT, "0.0.0.0", function () {
  console.log(
    `⚡️[server]: Kiltiskamera server is running at http://localhost:${PORT}`
  );
});
