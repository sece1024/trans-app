const logger = require('../config/logger');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const outputDir = path.join(process.cwd(), 'data/uploads/files');

// 确保上传目录存在
const uploadDir = outputDir;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      logger.info('[multer] create: ' + uploadDir);
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 获取原始文件名（UTF-8编码）
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    // 检查是否存在同名文件
    const filePath = path.join(uploadDir, originalName);
    if (fs.existsSync(filePath)) {
      // 如果存在，先删除旧文件
      fs.unlinkSync(filePath);
      console.log(`delete existed file: ${originalName}`);
    }

    // 使用原始文件名保存新文件
    cb(null, originalName);
  },
});

const upload = multer({ storage: storage });

module.exports = { upload, uploadDir };
