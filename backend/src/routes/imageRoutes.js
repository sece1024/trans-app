const express = require('express');
const router = express.Router();
const { imageUpload, imageDir: uploadDir } = require('../config/multer');
const logger = require('../config/logger');
const { sanitizeFilename } = require('../middleware/sanitizeFilename');
const ImageService = require('../services/imageService');

const imageService = new ImageService(uploadDir);

router.post('/images/upload', imageUpload.single('image'), (req, res, next) => {
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
    next(error);
  }
});

router.get('/images', async (req, res, next) => {
  try {
    const images = await imageService.list();
    res.json(images);
  } catch (error) {
    logger.error('get image list failed:', error);
    next(error);
  }
});

router.get('/images/:filename', sanitizeFilename('filename'), (req, res, next) => {
  try {
    if (!imageService.exists(req.params.filename)) {
      return res.status(404).json({ message: 'image not found' });
    }
    res.sendFile(imageService.getFilePath(req.params.filename));
  } catch (error) {
    logger.error('get image failed:', error);
    next(error);
  }
});

router.get('/images/download/:filename', sanitizeFilename('filename'), (req, res) => {
  const { filename } = req.params;

  res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
  res.setHeader('Content-Type', 'application/octet-stream');
  const stream = imageService.createReadStream(filename);
  stream.on('error', (err) => {
    logger.error('image stream error:', err);
    if (!res.headersSent) {
      return err.code === 'ENOENT'
        ? res.status(404).json({ message: 'image not found' })
        : res.status(500).json({ message: 'download failed' });
    }
    res.destroy(err);
  });
  stream.pipe(res);
});

router.delete('/images/:filename', sanitizeFilename('filename'), async (req, res, next) => {
  try {
    const deleted = await imageService.delete(req.params.filename);
    if (!deleted) {
      return res.status(404).json({ message: 'image not found' });
    }
    res.json({ message: 'image deleted successfully' });
  } catch (error) {
    logger.error('delete image error:', error);
    next(error);
  }
});

module.exports = router;
