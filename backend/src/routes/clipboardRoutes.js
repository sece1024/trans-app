const express = require('express');
const router = express.Router();
const clipboardService = require('../services/clipboardService');
const parsePagination = require('../utils/pagination');
const logger = require('../config/logger');

const MAX_CLIPBOARD_LENGTH = 10000;

router.post('/clipboard', (req, res, next) => {
  try {
    const { text, deviceInfo } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'content is required' });
    }

    if (typeof text !== 'string' || text.length > MAX_CLIPBOARD_LENGTH) {
      return res.status(400).json({ message: 'Content too long' });
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
    const { limit, cursor } = parsePagination(req.query);
    res.json(clipboardService.getTextHistory({ limit, cursor }));
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
