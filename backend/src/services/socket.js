const dgram = require('dgram');
const socket = dgram.createSocket('udp4');

const PORT = process.env.SOCKET_PORT;
const ADDRESS = process.env.SOCKET_BOARD_CAST;

console.log('Start socket listener');

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

// 获取本机 IP 地址
function getLocalIP() {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1'; // 如果没有找到，返回本地回环地址
}

// 获取本机文件信息 (示例)
function getLocalFiles() {
    return [
        { name: 'file1.txt', size: 1024, hash: 'abcdef1234567890' },
        { name: 'file2.jpg', size: 2048, hash: 'fedcba0987654321' },
    ];
}

socket.on('message', (message, remote) => {
    try {
        console.log('original message: ', message.toString())
        const data = JSON.parse(message.toString());
        // 进行数据校验
        if (validateIP(data.ip)) {
            console.log('Received valid broadcast from:', remote.address);
            // 构造回应消息
            const response = {
                ip: getLocalIP(),
                files: getLocalFiles(),
            };
            const responseMessage = Buffer.from(JSON.stringify(response));

            // 发送回应消息
            socket.send(responseMessage, remote.port, remote.address, (err) => {
                if (err) {
                    console.error('Error sending response:', err);
                } else {
                    console.log('Response sent to:', remote.address);
                }
            });
        } else {
            console.log('Received invalid data:', data);
        }
    } catch (error) {
        console.error('Invalid JSON data:', message.toString());
    }
});

socket.on('listening', () => {
    const address = socket.address();
    console.log(`UDP server listening on ${address.address}:${address.port}`);
    socket.setBroadcast(true);
});

socket.on('error', (err) => {
    console.log(`UDP server error:\n${err.stack}`);
    socket.close();
});

socket.bind(PORT, ADDRESS);

// 在适当的时候调用 socket.close();

module.exports = socket;