const express = require('express');
const router = express.Router();
const clipboardService = require('../services/clipboardService');
const logger = require('../config/logger');

router.post('/clipboard', (req, res) => {
  try {
    const { text, deviceInfo } = req.body;

    if (!text) {
      return res.status(400).json({ message: '内容不能为空' });
    }

    const clips = clipboardService.saveTextContent(text, 'text', deviceInfo);
    res.json(clips);
  } catch (error) {
    logger.error('clipboard save failed:', error);
    res.status(500).json({ message: 'Save failed' });
  }
});

router.get('/clipboard', (req, res) => {
  try {
    const clips = clipboardService.getTextHistory();
    res.json(clips);
  } catch (error) {
    logger.error('clipboard get failed:', error);
    res.status(500).json({ message: 'Get failed' });
  }
});

router.delete('/clipboard/:contentId', (req, res) => {
  try {
    const contentId = req.params.contentId;
    const changes = clipboardService.delete(contentId);
    if (changes === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    logger.error('clipboard delete failed:', error);
    res.status(500).json({ message: 'Delete failed' });
  }
});

module.exports = router;
