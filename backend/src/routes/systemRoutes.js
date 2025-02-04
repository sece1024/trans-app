const express = require('express');
const router = express.Router();
const os = require('os');

// 获取服务器IP地址
router.get('/server-info', (req, res) => {
  try {
    const networkInterfaces = os.networkInterfaces();
    const ips = [];

    // 获取所有网络接口的IP地址
    Object.keys(networkInterfaces).forEach((interfaceName) => {
      const addresses = networkInterfaces[interfaceName];
      addresses.forEach((addr) => {
        // 只获取IPv4地址且不是本地回环地址
        if (addr.family === 'IPv4' && !addr.internal) {
          ips.push({
            name: interfaceName,
            address: addr.address
          });
        }
      });
    });

    res.json({
      ips: ips,
      port: process.env.PORT || 3000  // 添加服务器端口
    });
  } catch (error) {
    res.status(500).json({ message: '获取服务器信息失败', error: error.message });
  }
});

module.exports = router; 