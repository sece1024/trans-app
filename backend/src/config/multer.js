const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: function (req, file, cb) {
    // 对原始文件名进行 UTF-8 编码
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    // 生成时间戳，避免文件名冲突
    const timestamp = Date.now();
    // 使用时间戳和编码后的文件名组合
    const fileName = `${timestamp}-${originalName}`;
    
    cb(null, fileName);
  }
});

const upload = multer({ storage: storage });

module.exports = upload; 