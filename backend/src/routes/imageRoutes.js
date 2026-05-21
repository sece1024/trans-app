const express = require('express');
const router = express.Router();
const { imageUpload, imageDir: uploadDir } = require('../config/multer');
const path = require('path');
const fsSync = require('fs');
const fs = require('fs/promises');
const logger = require('../config/logger');
const { sanitizeFilename } = require('../middleware/sanitizeFilename');

router.post('/images/upload', imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'no image' });
    }

    res.json({
      message: 'image upload success',
      filename: req.file.filename,
      originalName: req.file.originalname,
    });
  } catch (error) {
    logger.error('image upload error: ', error);
    res.status(500).json({ message: 'image upload failed' });
  }
});

// 获取图片列表
router.get('/images', async (req, res) => {
  try {
    if (!fsSync.existsSync(uploadDir)) {
      return res.json([]);
    }

    const files = await fs.readdir(uploadDir);
    const images = files.map((filename) => ({
      filename,
      originalName: filename,
    }));

    res.json(images);
  } catch (error) {
    logger.error('获取图片列表时出错:', error);
    res.status(500).json({ message: '获取图片列表失败' });
  }
});

// 获取单张图片
router.get('/images/:filename', sanitizeFilename('filename'), (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(uploadDir, filename);

    if (!fsSync.existsSync(imagePath)) {
      return res.status(404).json({ message: '图片不存在' });
    }

    res.sendFile(imagePath);
  } catch (error) {
    logger.error('获取图片时出错:', error);
    res.status(500).json({ message: '获取图片失败' });
  }
});

// 下载图片
router.get('/images/download/:filename', sanitizeFilename('filename'), (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(uploadDir, filename);

    if (!fsSync.existsSync(imagePath)) {
      return res.status(404).json({ message: '图片不存在' });
    }

    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const fileStream = fsSync.createReadStream(imagePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('下载图片时出错:', error);
    res.status(500).json({ message: '下载图片失败' });
  }
});

router.delete('/images/:filename', sanitizeFilename('filename'), async (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(uploadDir, filename);
    if (!fsSync.existsSync(imagePath)) {
      return res.status(404).json({ message: 'image not found' });
    }
    await fs.unlink(imagePath);
    res.json({ message: 'image deleted successfully' });
  } catch (error) {
    logger.error('delete image error:', error);
    res.status(500).json({ message: 'delete image failed' });
  }
});

module.exports = router;
