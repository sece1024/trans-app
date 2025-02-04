const multer = require('multer');
const fs = require('fs');
const path = require('path');

// 确保上传目录存在
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: function (req, file, cb) {
    // 获取原始文件名（UTF-8编码）
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    // 检查是否存在同名文件
    const filePath = path.join(uploadDir, originalName);
    if (fs.existsSync(filePath)) {
      // 如果存在，先删除旧文件
      fs.unlinkSync(filePath);
      console.log(`已删除旧文件: ${originalName}`);
    }
    
    // 使用原始文件名保存新文件
    cb(null, originalName);
  }
});

const upload = multer({ storage: storage });

module.exports = upload; 