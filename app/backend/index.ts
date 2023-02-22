import { RawData, WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({
  port: 8080,
});

type ChatMessage = {
  timestamp: string,
  text: string
};

enum WsMessageType {
  message = 'MESSAGE',
  init_all = 'ALL',
}

const messages: ChatMessage[] = [];

const handleMessage = (data: RawData) => {
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
      type: WsMessageType.init_all,
      data: messages,
    },
  );
  socket.send(data);
};

const start = () => {
  wss.on('connection', (socket) => {
    handleConnect(socket);

    socket.on('message', (data) => {
      try {
        const msg = handleMessage(data);
        wss.clients.forEach((s) => {
          const msgData = JSON.stringify({
            type: WsMessageType.message,
            data: msg,
          });
          s.send(msgData);
        });
      } catch (err) {
        console.log('Invalid message:', err);
      }
    });
  });
};

start();
