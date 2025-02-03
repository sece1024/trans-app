const express = require('express');
const router = express.Router();
const clipboardService = require('../services/clipboardService');

// 添加剪贴内容
router.post('/clipboard', (req, res) => {
  try {
    const { text } = req.body;
    const clientId = req.headers['x-client-id'] || 'anonymous';

    if (!text) {
      return res.status(400).json({ message: '内容不能为空' });
    }

    const clips = clipboardService.addClip(text, clientId);
    res.json(clips);
  } catch (error) {
    res.status(500).json({ message: '保存失败', error: error.message });
  }
});

// 获取剪贴板内容
router.get('/clipboard', (req, res) => {
  try {
    const clips = clipboardService.getAllClips();
    res.json(clips);
  } catch (error) {
    res.status(500).json({ message: '获取失败', error: error.message });
  }
});

module.exports = router; 