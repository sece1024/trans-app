const net = require('net');

// 定义端口
const PORT = 8888;

// 创建 Socket 服务器
const server = net.createServer((socket) => {
    console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);

    // 接收客户端发送的消息
    socket.on('data', (data) => {
        const message = data.toString().trim();
        console.log(`Received message: ${message}`);
    });

    // 客户端断开连接
    socket.on('close', () => {
        console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
    });

    // 错误处理
    socket.on('error', (err) => {
        console.error(`Socket error: ${err.message}`);
    });
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`Socket server started on port ${PORT}`);
});