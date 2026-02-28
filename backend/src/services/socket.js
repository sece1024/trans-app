const logger = require('../config/logger');
const WebSocket = require('ws');
const clipboardService = require('./clipboardService');
const serverInfo = require('../utils/internet').internetInfos;
const myIPs = serverInfo.map((s) => s.address);
const otherIPList = [];
const shared = require('./socketSharedData');
const { getLocalData } = require('./dataService');

const clients = new Set();

const PORT = process.env.SOCKET_PORT;
const BROADCAST_ADDRESS = process.env.SOCKET_BOARD_CAST;

logger.info('Starting socket service');

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
    logger.info(`[${new Date().toISOString()}] message from ${rinfo.address}:${rinfo.port}`);
    const parsed = JSON.parse(data.toString());
    const remoteIp = parsed.ip.join(',');
    const localIP = localData.ip.join(',');
    const remoteData = parsed.data;

    logger.info(`local ip: ${localIP}`);
    logger.info(`remote ip: ${remoteIp}`);
    if (remoteIp !== localIP) {
      switch (parsed.type) {
        case 'sync':
          syncRemoteData(remoteData, remoteIp);
          dgramSocket.send(
            Buffer.from(JSON.stringify({ ...localData, type: 'update' })),
            PORT,
            rinfo.address,
            (err) => {
              if (err) {
                logger.error(`broadcast failed: ${err}`);
              } else {
                logger.info(`broadcast address: ${BROADCAST_ADDRESS}:${PORT}`);
              }
            }
          );
          break;
        case 'update':
          syncRemoteData(remoteData, remoteIp);
          break;
        default:
          logger.warn('invalid broadcast type');
      }
    }
  });
  dgramSocket.on('error', (err) => {
    logger.error(`UDP server error:\n${err.stack}`);
    dgramSocket.close();
  });

  dgramSocket.bind(8888, () => {
    logger.info('Listening UDP broadcast port: 8888');
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
      logger.info('received text upload: ' + data);
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
          logger.error('file save failed: ' + err);
          ws.send(
            JSON.stringify({
              status: 'error',
              message: '文件保存失败',
            })
          );
        } else {
          logger.info(`file saved: ${filePath}`);
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
      logger.warn('unknown upload type: ' + uploadData.contentType);
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
      logger.info('received upload: ' + uploadInfo.content);

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
      logger.info('client disconnected');
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

const startSocket = async () => {
  const localData = await getLocalData();
  broadcastMyIP(localData);
  startWebSocketServer();
};

startSocket();

const socketServer = {
  myIPs,
  otherIPList,
};

module.exports = socketServer;
