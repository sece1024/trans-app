const express = require('express');
const router = express.Router();

// 获取服务器IP地址
router.get('/server-info', (req, res) => {
  try {
    const ips = require('../utils/internet').internetInfos;

    res.json({
      ips: ips,
      port: process.env.PORT || 3000, // 添加服务器端口
    });
  } catch (error) {
    res.status(500).json({ message: '获取服务器信息失败', error: error.message });
  }
});

module.exports = router;
