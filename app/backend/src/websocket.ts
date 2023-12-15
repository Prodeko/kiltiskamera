import { WebSocketServer, WebSocket, RawData } from "ws";
import { ProdekoUser, addOnlineToken, getOnlineTokens } from "./tokens";
import { CHAT_MAX_MESSAGES, CHAT_MESSAGE_TTL } from "./configuration";
type ChatMessage = {
  timestamp: string;
  text: string;
};

enum WsMessageType {
  MESSAGE = "MESSAGE",
  INIT_ALL = "ALL",
}

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
  const threshold = Date.now() - CHAT_MESSAGE_TTL;
  messages = _messages
    .filter((m) => new Date(m.timestamp).getTime() > threshold)
    .slice(0, CHAT_MAX_MESSAGES);
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
  setTimeout(() => filterMessagesJob(messages, clients), CHAT_MESSAGE_TTL);
};

export { handleConnect, handleWsMessage };
