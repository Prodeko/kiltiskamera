import { RawData, WebSocketServer, WebSocket } from 'ws';

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
      data: msg,
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
