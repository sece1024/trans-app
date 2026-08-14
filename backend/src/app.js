const express = require('express');
const cors = require('cors');
const path = require('path');
const fileRoutes = require('./routes/fileRoutes');
const clipboardRoutes = require('./routes/clipboardRoutes');
const systemRoutes = require('./routes/systemRoutes');
const imageRoutes = require('./routes/imageRoutes');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const logger = require('./config/logger');
const { isCompiled } = require('./utils/runtime');

// Initialize database (creates table if needed)
require('./db/database');
logger.info('Database initialized successfully');

if (isCompiled()) {
  logger.info('Server is running in production mode (compiled binary)');
} else {
  logger.info('Server is running in development mode');
}

const app = express();

const staticDir = isCompiled()
  ? path.join(path.dirname(process.execPath), 'public')
  : path.join(__dirname, '../../frontend', 'build');

// 中间件
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (same-origin, curl, mobile apps)
      if (!origin) return callback(null, true);
      // Allow localhost and private network IPs
      const allowed = /^https?:\/\/(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;
      if (allowed.test(origin)) return callback(null, true);
      callback(null, false);
    },
  })
);
app.use(express.json());

// 写接口按 IP 限流，防止局域网内滥用（GET 读取不受限）
const writeLimiter = rateLimiter({ windowMs: 60_000, max: 60 });
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});

// Vite emits content-hashed asset filenames under /assets — safe to cache long-term.
// index.html must stay no-cache so app updates are picked up immediately.
const staticOptions = {
  setHeaders(res, filePath) {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
};

app.use(express.static(staticDir, staticOptions));

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

// /api 未匹配路由返回 JSON 404（避免被 SPA 兜底吞掉）
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// 所有未匹配的路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

module.exports = app;
