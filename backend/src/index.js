require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});

// 端口被占用等启动期错误：输出可操作的提示而非裸堆栈
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(
      `Port ${PORT} is already in use. Stop the conflicting process or set PORT in backend/.env`
    );
  } else {
    logger.error('Server failed to start:', error);
  }
  process.exit(1);
});
