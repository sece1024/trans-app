const express = require('express');
const router = express.Router();
const clipboardService = require('../services/clipboardService');
const clipboardEvents = require('../services/clipboardEvents');
const parsePagination = require('../utils/pagination');
const logger = require('../config/logger');

const MAX_CLIPBOARD_LENGTH = 10000;

// SSE：剪贴板变更实时推送，替代前端轮询
router.get('/clipboard/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  // 断线后 EventSource 按此间隔自动重连
  res.write('retry: 3000\n\n');

  clipboardEvents.subscribe(res);
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clipboardEvents.unsubscribe(res);
  });
});

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
    clipboardEvents.notify('clipboard-changed');
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
    clipboardEvents.notify('clipboard-changed');
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    logger.error('clipboard delete failed:', error);
    next(error);
  }
});

module.exports = router;
