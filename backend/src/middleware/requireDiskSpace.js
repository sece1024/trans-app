const { getAvailableBytes } = require('../utils/diskSpace');

const MB = 1024 * 1024;

// 上传前检查磁盘剩余空间：低于阈值时返回 507，避免写盘中途失败。
// dir：需要检查的上传目录（其所在文件系统的可用空间）。
// minBytes：允许上传所需的最小剩余字节数。
function requireDiskSpace(dir, minBytes) {
  return (req, res, next) => {
    try {
      const free = getAvailableBytes(dir);
      if (free < minBytes) {
        return res.status(507).json({
          message: `存储空间不足（剩余约 ${Math.floor(free / MB)} MB），请清理后重试`,
        });
      }
      next();
    } catch (error) {
      // 获取磁盘信息失败时不应阻塞上传，交由 multer / errorHandler 兜底
      next();
    }
  };
}

module.exports = requireDiskSpace;
