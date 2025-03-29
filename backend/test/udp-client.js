// client.js
const dgram = require('dgram');
const WebSocket = require('ws');
const fs = require('fs');

// 1. 监听UDP广播，获取服务端IP
const socket = dgram.createSocket('udp4');
const PORT = 8888;

socket.on('message', (msg) => {
    const message = msg.toString();
    if (message.startsWith('SERVER_IP:')) {
        const serverIP = message.split(':')[1];
        console.log(`发现服务端IP: ${serverIP}`);
        socket.close(); // 停止监听

        // 2. 通过WebSocket连接服务端并发送文件
        const ws = new WebSocket(`ws://${serverIP}:8080`);
        ws.on('open', () => {
            console.log('WebSocket已连接，开始发送文件...');
            // const fileData = fs.readFileSync('./test.jpg'); // 替换为你的文件
            // ws.send(fileData, { binary: true }, () => {
            //     console.log('文件发送完成');
            //     ws.close();
            // });
        });
    }
});

socket.bind(PORT, () => {
    console.log('监听UDP广播中...');
});