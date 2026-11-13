const express = require('express');
const router = express.Router();
const internet = require('../utils/internet');
const logger = require('../config/logger');
const { MAX_CLIPBOARD_HISTORY } = require('../config/limits');

// 获取服务器IP地址
router.get('/server-info', (req, res, next) => {
  try {
    const ips = internet.getInternetInfos();

    res.json({
      ips: ips,
      port: process.env.PORT || 5001,
      // 剪贴板历史上限可由环境变量配置，前端不能再用编译期常量判断「已满」
      maxClipboardHistory: MAX_CLIPBOARD_HISTORY,
    });
  } catch (error) {
    logger.error('get server-info failed:', error);
    next(error);
  }
});

module.exports = router;
