const express = require('express');
const router = express.Router();
const { imageUpload, imageDir: uploadDir } = require('../config/multer');
const logger = require('../config/logger');
const { sanitizeFilename } = require('../middleware/sanitizeFilename');
const ImageService = require('../services/imageService');

const imageService = new ImageService(uploadDir);

router.post('/images/upload', imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'no image' });
    }

    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    res.json({
      message: 'image upload success',
      filename: req.file.filename,
      originalName,
    });
  } catch (error) {
    logger.error('image upload error: ', error);
    res.status(500).json({ message: 'image upload failed' });
  }
});

router.get('/images', async (req, res) => {
  try {
    const images = await imageService.list();
    res.json(images);
  } catch (error) {
    logger.error('获取图片列表时出错:', error);
    res.status(500).json({ message: '获取图片列表失败' });
  }
});

router.get('/images/:filename', sanitizeFilename('filename'), (req, res) => {
  try {
    if (!imageService.exists(req.params.filename)) {
      return res.status(404).json({ message: '图片不存在' });
    }
    res.sendFile(imageService.getFilePath(req.params.filename));
  } catch (error) {
    logger.error('获取图片时出错:', error);
    res.status(500).json({ message: '获取图片失败' });
  }
});

router.get('/images/download/:filename', sanitizeFilename('filename'), (req, res) => {
  try {
    const { filename } = req.params;
    if (!imageService.exists(filename)) {
      return res.status(404).json({ message: '图片不存在' });
    }

    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    imageService.createReadStream(filename).pipe(res);
  } catch (error) {
    logger.error('下载图片时出错:', error);
    res.status(500).json({ message: '下载图片失败' });
  }
});

router.delete('/images/:filename', sanitizeFilename('filename'), async (req, res) => {
  try {
    const deleted = await imageService.delete(req.params.filename);
    if (!deleted) {
      return res.status(404).json({ message: 'image not found' });
    }
    res.json({ message: 'image deleted successfully' });
  } catch (error) {
    logger.error('delete image error:', error);
    res.status(500).json({ message: 'delete image failed' });
  }
});

module.exports = router;
