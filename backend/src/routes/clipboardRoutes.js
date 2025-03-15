const express = require('express');
const router = express.Router();
const clipboardService = require('../services/clipboardService');
const logger = require('../config/logger')

router.post('/clipboard', async (req, res) => {
  try {
    const { text, deviceInfo } = req.body;

    if (!text) {
      return res.status(400).json({ message: '内容不能为空' });
    }

    const clips = await clipboardService.saveTextContent(text, 'text', deviceInfo);
    res.json(clips);
  } catch (error) {
    res.status(500).json({ message: 'Save failed', error: error.message });
  }
});

router.get('/clipboard', async (req, res) => {
  try {
    const clips = await clipboardService.getTextHistory();
    res.json(clips);
  } catch (error) {
    res.status(500).json({ message: 'Get failed', error: error.message });
  }
});


router.delete('/clipboard/:contentId', async (req, res) => {
  try {
    const contentId = req.params.contentId;
    const result = await clipboardService.delete(contentId);
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: 'Delete failed', error: error.message })
  }
})

module.exports = router; 