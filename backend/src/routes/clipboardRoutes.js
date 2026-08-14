const express = require('express');
const router = express.Router();
const clipboardService = require('../services/clipboardService');
const parsePagination = require('../utils/pagination');
const logger = require('../config/logger');

router.post('/clipboard', (req, res, next) => {
  try {
    const { text, deviceInfo } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'content is required' });
    }

    const clips = clipboardService.saveTextContent(text, 'text', deviceInfo);
    res.json(clips);
  } catch (error) {
    logger.error('clipboard save failed:', error);
    next(error);
  }
});

router.get('/clipboard', (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    res.json(clipboardService.getTextHistory({ limit, offset }));
  } catch (error) {
    logger.error('clipboard get failed:', error);
    next(error);
  }
});

router.delete('/clipboard/:contentId', (req, res, next) => {
  try {
    const contentId = req.params.contentId;
    const changes = clipboardService.delete(contentId);
    if (changes === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    logger.error('clipboard delete failed:', error);
    next(error);
  }
});

module.exports = router;
