const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fsSync = require('fs');
const fs = require('fs/promises');

const imageDir = '../../uploads/images';

// 配置图片存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, imageDir);
    // 确保上传目录存在
    if (!fsSync.existsSync(uploadDir)) {
      fsSync.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // 只允许上传图片
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  }
});

// 上传图片
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '没有选择图片' });
    }

    res.json({
      message: '图片上传成功',
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('上传图片时出错:', error);
    res.status(500).json({ message: '上传图片失败' });
  }
});

// 获取图片列表
router.get('/images', async (req, res) => {
  try {
    const imageDir = path.join(__dirname, '../../uploads/images');
    if (!fsSync.existsSync(imageDir)) {
      return res.json([]);
    }

    const files = await fs.readdir(imageDir);
    const images = files.map(filename => ({
      filename,
      originalName: filename // 这里可以从数据库中获取原始文件名
    }));

    res.json(images);
  } catch (error) {
    console.error('获取图片列表时出错:', error);
    res.status(500).json({ message: '获取图片列表失败' });
  }
});

// 获取单张图片
router.get('/images/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, imageDir, filename);

    if (!fsSync.existsSync(imagePath)) {
      return res.status(404).json({ message: '图片不存在' });
    }

    res.sendFile(imagePath);
  } catch (error) {
    console.error('获取图片时出错:', error);
    res.status(500).json({ message: '获取图片失败' });
  }
});

// 下载图片
router.get('/images/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, imageDir, filename);

    if (!fsSync.existsSync(imagePath)) {
      return res.status(404).json({ message: '图片不存在' });
    }

    // 设置下载响应头
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // 发送文件
    const fileStream = fsSync.createReadStream(imagePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('下载图片时出错:', error);
    res.status(500).json({ message: '下载图片失败' });
  }
});

module.exports = router; 