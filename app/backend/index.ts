import express from 'express';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
  port: 8080,
});

const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello Worlds!')
})

app.listen()

const start = () => {
    wss.on('connection', (socket) => {
        console.log("CONNECTED");

        socket.on("message", (data) => {
            console.log('received: %s', data);
        })
    });

    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })
}

start();