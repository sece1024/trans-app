// client.js
const CLIENT_NAME = 'udp';
const logger = require('../src/config/logger');
const dgram = require('dgram');
const get = require('lodash/get');

// 1. 监听UDP广播，获取服务端IP
const socket = dgram.createSocket('udp4');
const PORT = 8888;
socket.on('message', (msg, rinfo) => {
  const message = msg.toString();
  logger.test(CLIENT_NAME, `receive message: ${msg} from ${rinfo.address}`);
  if (message instanceof Buffer || message instanceof ArrayBuffer) {
    logger.test(CLIENT_NAME, `收到二进制文件数据，长度: ${message.length}`);
  } else {
    try {
      const parsed = JSON.parse(message);

      if (Array.isArray(parsed)) {
        parsed.forEach((parsedItem) => {
          const ipAddress = get(parsedItem, 'address', '');
          logger.test(CLIENT_NAME, `ipAddress: ${ipAddress}`);
          if (ipAddress) {
            logger.test(CLIENT_NAME, `hello ${ipAddress}, ${PORT}, ${ipAddress}`);
            socket.send(`hello ${ipAddress}`, PORT, ipAddress);
          }
        });
      } else if (typeof parsed === 'object' && parsed !== null) {
        logger.test(CLIENT_NAME, `object: ${parsed}`);
      } else if (typeof parsed === 'string') {
        logger.test(CLIENT_NAME, `string: ${parsed}`);
      } else {
        logger.test(CLIENT_NAME, `other: ${parsed}`);
      }
    } catch (err) {
      logger.test(CLIENT_NAME, `ERROR: not a json string: ${err}`);
    }
  }
  // socket.close();
});

socket.on('close', () => {
  logger.test(CLIENT_NAME, `socket close`);
});

socket.bind(PORT, () => {
  logger.test(CLIENT_NAME, '监听UDP广播中...');
});
