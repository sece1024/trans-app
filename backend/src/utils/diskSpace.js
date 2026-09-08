const fs = require('fs');

// 返回指定路径所在文件系统对非特权用户可用的剩余字节数（bavail × bsize）。
// 用于上传前检查磁盘空间，避免 SD 卡写满导致写入静默失败。
function getAvailableBytes(targetPath) {
  const stats = fs.statfsSync(targetPath);
  return stats.bavail * stats.bsize;
}

module.exports = { getAvailableBytes };
