const WebSocket = require('ws');

// 客户端（浏览器或Node.js）
const ws = new WebSocket('ws://localhost:8888');
ws.on('open', () => {
  ws.send('Hello WebSocket!');
});
ws.on('message', (data) => {
  console.log(data);
});
