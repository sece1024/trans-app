const logger = require('../config/logger');

// 将可读流管道到响应，统一处理流错误（文件不存在 / 读取失败）
function pipeStream(stream, res, notFoundMessage) {
  stream.on('error', (err) => {
    logger.error('download stream error:', err);
    if (!res.headersSent) {
      return err.code === 'ENOENT'
        ? res.status(404).json({ message: notFoundMessage })
        : res.status(500).json({ message: 'download failed' });
    }
    res.destroy(err);
  });
  stream.pipe(res);
}

module.exports = pipeStream;
