const express = require('express');
const cors = require('cors');
const fileRoutes = require('./routes/fileRoutes');
const fileService = require('./services/fileService');
const CleanupService = require('./utils/cleanup');
const clipboardRoutes = require('./routes/clipboardRoutes');
const systemRoutes = require('./routes/systemRoutes');
const imageRoutes = require('./routes/imageRoutes');
const path = require('path');
const fs = require('fs')
const printDir = require('./utils/tool');
const logger = require('./config/logger');

if (process.pkg) {
  logger.info("应用正在运行在打包后的环境中");
} else {
  logger.info("应用在开发环境中运行");
}


const app = express();
const PORT = 5000;

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


// 所有未匹配的路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// 基础路由
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// 初始化清理服务
const cleanupService = new CleanupService(fileService);
cleanupService.startCleanupTask();

// 启动服务器
app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
}); 