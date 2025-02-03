const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000; // 后端服务端口

// 启用 CORS
app.use(cors());

// 解析 JSON 请求体
app.use(express.json());

// 示例路由
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
