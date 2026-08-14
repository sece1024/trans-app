const logger = require('./logger');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const decodeFilename = require('../utils/decodeFilename');

const UPLOAD_BASE = path.join(process.cwd(), 'data/uploads');

// 确保上传目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    logger.info('[multer] create: ' + dir);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 若目标文件已存在（同毫秒同名），在扩展名前追加递增后缀避免覆盖
function uniqueName(dir, filename) {
  if (!fs.existsSync(path.join(dir, filename))) return filename;
  const ext = path.extname(filename);
  const stem = filename.slice(0, filename.length - ext.length);
  let i = 1;
  while (fs.existsSync(path.join(dir, `${stem}-${i}${ext}`))) i += 1;
  return `${stem}-${i}${ext}`;
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
        const originalName = decodeFilename(file.originalname);
        cb(null, uniqueName(uploadDir, nameGenerator(originalName)));
      },
    }),
  };
}

// 文件上传配置（保留原始文件名 + 时间戳前缀）
const fileStorage = createStorage('files', (originalName) => {
  return `${Date.now()}-${originalName}`;
});

// 图片上传配置（保留原始文件名 + 时间戳前缀，与文件一致）
const imageStorage = createStorage('images', (originalName) => {
  return `${Date.now()}-${originalName}`;
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
      cb(Object.assign(new Error('Only image files are allowed'), { code: 'INVALID_IMAGE_TYPE' }));
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
