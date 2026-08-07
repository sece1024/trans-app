const express = require('express');
const router = express.Router();
const internet = require('../utils/internet');
const logger = require('../config/logger');

// 获取服务器IP地址
router.get('/server-info', (req, res, next) => {
  try {
    const ips = internet.internetInfos;

    res.json({
      ips: ips,
      port: process.env.PORT || 5001,
    });
  } catch (error) {
    logger.error('get server-info failed:', error);
    next(error);
  }
});

module.exports = router;
