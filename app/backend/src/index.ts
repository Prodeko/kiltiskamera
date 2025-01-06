import express = require("express");
import cors = require("cors");
import { Express, Request, Response } from "express";
import http = require("http");
import WebSocket = require("ws");
import passport = require("passport");
import path = require("path");
import session = require("express-session");
import cookieParser = require("cookie-parser");
import { ensureAuthenticated } from "./auth";
import { handleConnect, handleWsMessage } from "./websocket";
import {
  isTokenOnline,
  ProdekoUser,
  addOnlineToken,
  removeOnlineToken,
  getOnlineTokens,
} from "./tokens";
import {
  PORT,
  SESSION_SECRET,
  VIEWER_TOKEN_DESTROY_DELAY,
  ON_AIR_PASSWORD,
} from "./configuration";

// Setup express app and middlewares
const app: Express = express();
app.use(express.json());
app.use(cors());

app.use(cookieParser());
const sessionParser = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
});

app.get("/on_air", (req: Request, res: Response) => {
  // This endpoint returns whether someone is watching the stream

  // Get the password from the query params
  const { password } = req.query;

  // Replace this with your actual password
  const correctPassword = ON_AIR_PASSWORD;

  // Check if the password matches
  if (password !== correctPassword) {
    return res.status(401).json({
      error: "Unauthorized: Incorrect password",
    });
  }

  const tokens = getOnlineTokens();
  res.json({
    onAir: Object.keys(tokens).length > 0,
  });
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
    if (isTokenOnline(token)) {
      res.send(200);
    } else {
      res.send(401);
    }
  }
});

// All frontend routes
app.use(
  ensureAuthenticated,
  express.static(path.join(__dirname, "../../frontend/build"))
);

// Web app routes
app.get("/stream_url", ensureAuthenticated, (req: Request, res: Response) => {
  // This endpoint will be called from frontend
  res.set("Access-Control-Allow-Origin", "*"); // TODO cleanup
  const user = req.user as ProdekoUser;
  const token = addOnlineToken(user);

  const m3u8StreamSource = `https://kiltis.prodeko.org/live/hls/${token}/stream.m3u8`;
  console.log(`Client ${user.displayName} retrieved the stream URL.`);

  res.json({ url: m3u8StreamSource });
});

// Lower level section
// Setup HTTP and WS servers
const http_server = http.createServer();
const ws_server = new WebSocket.Server({
  noServer: true,
});

// Web socket handlers
ws_server.on("connection", function (socket: any, wsUser: ProdekoUser) {
  socket.on("error", console.error);
  console.log(`Client ${wsUser.displayName} connected to the WebSocket`);
  handleConnect(socket);

  socket.on("message", (data: any) => {
    try {
      handleWsMessage(data, wsUser, ws_server.clients);
    } catch (err) {
      console.log("Invalid message:", err);
    }
  });

  socket.on("close", () => {
    console.log(`Client ${wsUser.displayName} disconnected`);
    // Next we remove the viewing token
    // Essentially, it only allows watching happen traceably
    setTimeout(() => {
      removeOnlineToken(wsUser);
    }, VIEWER_TOKEN_DESTROY_DELAY);
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
