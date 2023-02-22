import { RawData, WebSocketServer } from 'ws';

const wss = new WebSocketServer({
  port: 8080,
});

type ChatMessage = {
  timestamp: Date,
  text: string
};

const messages: ChatMessage[] = [];

const handleMessage = (data: RawData) => {
  const { timestamp, text } = JSON.parse(data.toString());
  if (!timestamp || !text) {
    throw new Error('Invalid message');
  }

  const msg = { timestamp, text } as ChatMessage;
  messages.push(msg);
  return msg;
};

const start = () => {
  wss.on('connection', (socket) => {
    console.log('CONNECTED');

    socket.on('message', (data) => {
      try {
        const msg = handleMessage(data);
        wss.clients.forEach((s) => {
          s.send(JSON.stringify(msg));
        });
      } catch (err) {
        console.log('Invalid message:', err);
      }
    });
  });
};

start();
