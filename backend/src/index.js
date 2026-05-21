const express = require('express');
const cors = require('cors');
const fileRoutes = require('./routes/fileRoutes');
const clipboardRoutes = require('./routes/clipboardRoutes');
const systemRoutes = require('./routes/systemRoutes');
const imageRoutes = require('./routes/imageRoutes');
const errorHandler = require('./middleware/errorHandler');
const path = require('path');
require('dotenv').config();
const logger = require('./config/logger');
const sequelize = require('./db/database');

const PORT = process.env.PORT || 5001;

// Sync Database
async function initDatabase() {
  try {
    await sequelize.sync();
    logger.info('Database synchronized successfully');
  } catch (error) {
    logger.error('Unable to sync database:', error);
  }
}

if (process.pkg) {
  logger.info('Server is running in production mode');
} else {
  logger.info('Server is running in development mode');
}

const app = express();

const staticDir = path.join(__dirname, '../../frontend', 'build');

// 中间件
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, curl, mobile apps)
    if (!origin) return callback(null, true);
    // Allow localhost and private network IPs
    const allowed = /^https?:\/\/(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;
    if (allowed.test(origin)) return callback(null, true);
    callback(null, false);
  },
}));
app.use(express.json());

app.use(express.static(staticDir));

// 路由
app.use('/api', fileRoutes);
app.use('/api', clipboardRoutes);
app.use('/api', systemRoutes);
app.use('/api', imageRoutes);

// 基础路由
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// 错误处理中间件
app.use(errorHandler);

// 所有未匹配的路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// 启动服务器
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    logger.info(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
