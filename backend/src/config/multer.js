const logger = require('./logger');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const UPLOAD_BASE = path.join(process.cwd(), 'data/uploads');

// 确保上传目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    logger.info('[multer] create: ' + dir);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 创建存储配置
function createStorage(subDir, nameGenerator) {
  const uploadDir = path.join(UPLOAD_BASE, subDir);

  return {
    uploadDir,
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        ensureDir(uploadDir);
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, nameGenerator(originalName));
      },
    }),
  };
}

// 文件上传配置（保留原始文件名 + 时间戳前缀）
const fileStorage = createStorage('files', (originalName) => {
  return `${Date.now()}-${originalName}`;
});

// 图片上传配置（随机文件名 + 原始扩展名）
const imageStorage = createStorage('images', (originalName) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  return uniqueSuffix + path.extname(originalName);
});

// 文件上传实例（限制 100MB）
const fileUpload = multer({
  storage: fileStorage.storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// 图片上传实例（带类型和大小限制）
const imageUpload = multer({
  storage: imageStorage.storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = {
  fileUpload,
  imageUpload,
  fileDir: fileStorage.uploadDir,
  imageDir: imageStorage.uploadDir,
};
