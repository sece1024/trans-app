const express = require('express');
const router = express.Router();
const { imageUpload, imageDir: uploadDir } = require('../config/multer');
const logger = require('../config/logger');
const { sanitizeFilename } = require('../middleware/sanitizeFilename');
const contentDisposition = require('../utils/contentDisposition');
const decodeFilename = require('../utils/decodeFilename');
const pipeStream = require('../utils/streamResponse');
const parsePagination = require('../utils/pagination');
const FileService = require('../services/fileService');

const imageService = new FileService(uploadDir);

router.post('/images/upload', imageUpload.single('image'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'no image' });
    }

    const originalName = decodeFilename(req.file.originalname);

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
    const { limit, cursor } = parsePagination(req.query);
    res.json(await imageService.list({ limit, cursor }));
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

  res.setHeader('Content-Disposition', contentDisposition(imageService.getOriginalName(filename)));
  res.setHeader('Content-Type', 'application/octet-stream');
  pipeStream(imageService.createReadStream(filename), res, 'image not found');
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
