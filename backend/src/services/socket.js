const logger = require('../config/logger');
const os = require('os');
const dgram = require('dgram');
const WebSocket = require('ws');
const dgramSocket = dgram.createSocket('udp4');

const PORT = process.env.SOCKET_PORT;
const BROADCAST_ADDRESS = process.env.SOCKET_BOARD_CAST;

console.log('Start dgramSocket listener');

function validateIP(ip) {
    // 使用正则表达式校验 IP 地址
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipRegex.test(ip);
}

function validateFiles(files) {
    // 校验文件信息
    if (!Array.isArray(files)) {
        return false;
    }
    for (const file of files) {
        if (typeof file.name !== 'string' || typeof file.size !== 'number' || typeof file.hash !== 'string') {
            return false;
        }
    }
    return true;
}

// 获取本机 IPv4 地址
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const config of iface) {
            if (config.family === 'IPv4' && !config.internal) {
                logger.info(`IPv4: ${config.address}`)
                return config.address;
            }
        }
    }
    return '127.0.0.1';
}

const serverIP = getLocalIP();


// UDP
const broadcastMyIP =  () => {
    const dgramSocket = dgram.createSocket('udp4');
    const serverInfo = require('../utils/internet').getInternetInfos();
    dgramSocket.bind(() => {
        dgramSocket.setBroadcast(true);
        dgramSocket.send(JSON.stringify(serverInfo), PORT, BROADCAST_ADDRESS, (err) => {
            if (err) {
                logger.error(`broadcast failed: ${err}`)
            } else {
                logger.info(`broadcast address: ${BROADCAST_ADDRESS}:${PORT}`);
                dgramSocket.close();
            }
        })
    });
}

// wss
const startWebSocketServer = () => {
    const wss = new WebSocket.Server({port: PORT});
    logger.info(`Starting websocket server listening on port ${PORT}`);

    wss.on('connection', (ws) => {
        logger.info('client connected');
        ws.on('message', (data) => {
            logger.info(`Received message: ${data}`);
        })
    })

    wss.on('message', (data) => {
        logger.info(`Received message: ${data}`);
    })
}


// dgramSocket.on('message', (message, remote) => {
//     try {
//         console.log('original message: ', message.toString())
//         const data = JSON.parse(message.toString());
//         // 进行数据校验
//         if (validateIP(data.ip)) {
//             console.log('Received valid broadcast from:', remote.address);
//             // 构造回应消息
//             const response = {
//                 ip: getLocalIP(),
//                 files: getLocalFiles(),
//             };
//             const responseMessage = Buffer.from(JSON.stringify(response));
//
//             // 发送回应消息
//             dgramSocket.send(responseMessage, remote.port, remote.address, (err) => {
//                 if (err) {
//                     console.error('Error sending response:', err);
//                 } else {
//                     console.log('Response sent to:', remote.address);
//                 }
//             });
//         } else {
//             console.log('Received invalid data:', data);
//         }
//     } catch (error) {
//         console.error('Invalid JSON data:', message.toString());
//     }
// });
//
// dgramSocket.on('listening', () => {
//     const address = dgramSocket.address();
//     console.log(`UDP server listening on ${address.address}:${address.port}`);
//     dgramSocket.setBroadcast(true);
// });
//
// dgramSocket.on('error', (err) => {
//     console.log(`UDP server error:\n${err.stack}`);
//     dgramSocket.close();
// });

broadcastMyIP();
startWebSocketServer();

module.exports = dgramSocket;