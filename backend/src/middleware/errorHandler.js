const logger = require('../config/logger');

// 全局错误处理中间件
function errorHandler(err, req, res, next) {
  logger.error(`[Error] ${req.method} ${req.path}: ${err.message}`);

  // Multer 文件大小超限
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File too large',
    });
  }

  // Multer 文件类型错误
  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({
      message: err.message,
    });
  }

  // 默认 500 错误
  res.status(err.status || 500).json({
    message: err.status && err.status < 500 ? err.message : 'Internal server error',
  });
}

module.exports = errorHandler;
