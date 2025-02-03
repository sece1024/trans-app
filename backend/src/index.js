const express = require('express');
const cors = require('cors');
const fileRoutes = require('./routes/fileRoutes');
const fileService = require('./services/fileService');
const CleanupService = require('./utils/cleanup');

const app = express();
const PORT = 5000;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api', fileRoutes);

// 基础路由
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// 初始化清理服务
const cleanupService = new CleanupService(fileService);
cleanupService.startCleanupTask();

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}); 