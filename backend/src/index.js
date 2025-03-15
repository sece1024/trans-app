const express = require('express');
const cors = require('cors');
const fileRoutes = require('./routes/fileRoutes');
const fileService = require('./services/fileService');
const CleanupService = require('./utils/cleanup');
const clipboardRoutes = require('./routes/clipboardRoutes');
const systemRoutes = require('./routes/systemRoutes');
const imageRoutes = require('./routes/imageRoutes');
const path = require('path');
require('dotenv').config();
const logger = require('./config/logger');

if (process.pkg) {
  logger.info("Server is running in production mode");
} else {
  logger.info("Server is running in development mode");
}


const app = express();
const PORT = process.env.PORT || 5001;
logger.info(`process.env.PORT: ${process.env.PORT}`);

const staticDir = path.join(__dirname, '../../frontend', 'build');


app.use(express.static(staticDir));

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api', fileRoutes);
app.use('/api', clipboardRoutes);
app.use('/api', systemRoutes);
app.use('/api', imageRoutes); 



// 基础路由
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// 初始化清理服务
const cleanupService = new CleanupService(fileService);
cleanupService.startCleanupTask();

// 所有未匹配的路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});


// 启动服务器
app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
}); 