import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
  port: 8080,
});

const start = () => {
  wss.on('connection', (socket) => {
    console.log('CONNECTED');

    socket.on('message', (data) => {
      console.log('received: %s', data);
    });
  });
};

start();
