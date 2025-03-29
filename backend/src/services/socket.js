const logger = require('../config/logger');
const WebSocket = require('ws');
const clipboardService = require('./clipboardService');
const serverInfo = require('../utils/internet').internetInfos;
const myIPs = serverInfo.map((s) => s.address);
const otherIPList = [];
const sharedText = [];
const shared = require('./socketSharedData');
const { getLocalData } = require('./dataService');

const clients = new Set();

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
    if (
      typeof file.name !== 'string' ||
      typeof file.size !== 'number' ||
      typeof file.hash !== 'string'
    ) {
      return false;
    }
  }
  return true;
}

// UDP
const broadcastMyIP = (localData) => {
  const dgram = require('dgram');
  const dgramSocket = dgram.createSocket('udp4');
  dgramSocket.on('message', (data, rinfo) => {
    console.log(`[${new Date().toISOString()}] 来自 ${rinfo.address}:${rinfo.port} 的消息:`);
    const parsed = JSON.parse(data.toString());
    if (parsed.type === 'sync') {
      const remoteIp = parsed.ip;
      if (remoteIp.join(',') !== localData.ip.join(',')) {
        const remoteData = parsed.data;
        syncRemoteData(remoteData, remoteIp);
      }
    }
  });
  // 监听错误事件
  dgramSocket.on('error', (err) => {
    console.error(`服务器错误:\n${err.stack}`);
    dgramSocket.close();
  });

  dgramSocket.bind(8888, () => {
    console.log('监听UDP广播端口: 8888');
    dgramSocket.setBroadcast(true);
    let data = { ...localData, type: 'sync' };
    dgramSocket.send(Buffer.from(JSON.stringify(data)), PORT, BROADCAST_ADDRESS, (err) => {
      if (err) {
        logger.error(`broadcast failed: ${err}`);
      } else {
        logger.info(`broadcast address: ${BROADCAST_ADDRESS}:${PORT}`);
      }
    });
  });
};

const handleUpload = (ws, uploadData) => {
  let parsed = JSON.parse(uploadData);
  const contentType = parsed.contentType;
  const data = parsed.data;
  logger.info(`contentType: ${contentType}`);
  switch (contentType) {
    case 'text':
      console.log('收到文本上传:', data);
      // 触发自定义upload事件
      ws.emit('upload', {
        type: 'text',
        content: data,
      });
      break;

    case 'file':
    case 'image':
      const buffer = Buffer.from(data, 'base64');
      const fileName = `upload_${Date.now()}_${parsed.fileName}`;
      const filePath = path.join(__dirname, 'uploads', fileName);

      fs.writeFile(filePath, buffer, (err) => {
        if (err) {
          console.error('文件保存失败:', err);
          ws.send(
            JSON.stringify({
              status: 'error',
              message: '文件保存失败',
            })
          );
        } else {
          console.log(`文件保存成功: ${filePath}`);
          // 触发自定义upload事件
          ws.emit('upload', {
            type: uploadData.contentType,
            fileName: fileName,
            filePath: filePath,
            fileType: uploadData.fileType,
          });
        }
      });
      break;

    default:
      console.warn('未知的上传类型:', uploadData.contentType);
  }
};

function syncRemoteData(remoteData, remoteIp) {
  logger.info(remoteData);
  if (remoteIp && remoteData) {
    logger.info(`save remote data: ${remoteData}`);
    shared.sharedData.set(remoteIp, remoteData);
  } else {
    logger.warn('invalid remote data, not to save');
  }
}

// wss
const startWebSocketServer = () => {
  const wss = new WebSocket.Server({ port: PORT });
  logger.info(`Starting websocket server listening on port ${PORT}`);

  wss.on('connection', (ws) => {
    clients.add(ws);
    logger.info('new client connected');

    ws.on('message', (data) => {
      logger.info(`Received message: ${data.toString()}`);
      const parsed = JSON.parse(data);

      if (parsed.type === 'ip' && parsed.data) {
        const ips = parsed.data;
        logger.info(`ips: ${ips}`);
        for (const ip of ips) {
          if (ip.address && !myIPs.includes(ip)) {
            logger.info(`client ip address: ${ip.address}`);
            otherIPList.push(ip.address);
          }
        }
      } else if (parsed.type === 'upload') {
        handleUpload(ws, data);
      } else if (parsed.type === 'sync') {
        const remoteIp = parsed.ip;
        const remoteData = parsed.data;
        syncRemoteData(remoteData, remoteIp);
      } else {
        logger.info('other message');
      }
    });

    ws.on('upload', async (uploadInfo) => {
      console.log('收到上传:', uploadInfo.content);

      // 根据不同类型处理
      switch (uploadInfo.type) {
        case 'text':
          // 处理文本
          await clipboardService.saveTextContent(uploadInfo.content, 'text', null);
          clients.forEach((client) => {
            client.send(JSON.stringify({ uploadInfo }));
          });
          break;
        case 'image':
          // 处理图片
          break;
        case 'file':
          // 处理文件
          break;
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('client disconnected');
    });

    ws.on('error', (err) => {
      logger.error(`connect failed: ${err}`);
    });
  });

  wss.on('error', (err) => {
    logger.error(`Socket error: ${err.message}`);
  });

  wss.on('close', () => {
    logger.info(`client disconnected`);
  });
};

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

const startSocket = async () => {
  const localData = await getLocalData();
  broadcastMyIP(localData);
  startWebSocketServer();
};

startSocket();

const socketServer = {
  myIPs,
  otherIPList,
  sharedText,
};

module.exports = socketServer;
