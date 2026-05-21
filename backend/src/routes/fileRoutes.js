const express = require('express');
const router = express.Router();
const { fileUpload, fileDir: uploadDir } = require('../config/multer');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const logger = require('../config/logger');
const { sanitizeFilename } = require('../middleware/sanitizeFilename');

// 文件上传路由
router.post('/files/upload', fileUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'file not found' });
    }

    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    res.json({
      message: 'file upload success!',
      fileId: req.file.filename,
      originalName: originalName,
    });
  } catch (error) {
    logger.error('file upload failed:', error);
    res.status(500).json({
      message: 'file upload failed',
    });
  }
});

router.get('/files/:fileName', sanitizeFilename('fileName'), async (req, res) => {
  try {
    const filePath = path.join(uploadDir, req.params.fileName);

    if (!fsSync.existsSync(filePath)) {
      return res.status(404).json({ message: 'file not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    logger.error('file retrieval failed:', error);
    res.status(500).json({ message: 'file retrieval failed' });
  }
});

router.get('/files', async (req, res) => {
  logger.info('get files info');
  const fileDir = path.join(uploadDir);
  if (!fsSync.existsSync(fileDir)) {
    return res.json([]);
  }
  const files = await fs.readdir(fileDir);
  const fileInfos = [];
  for (const file of files) {
    const filePath = path.join(fileDir, file);
    const stats = await fs.stat(filePath);
    // 分离时间戳前缀，获取原始文件名
    const originalName = file.includes('-') ? file.substring(file.indexOf('-') + 1) : file;
    fileInfos.push({
      name: file,
      originalName: originalName,
      sizeInMB: (stats.size / (1024 * 1024)).toFixed(1),
    });
  }

  res.json(fileInfos);
});

router.get('/download/:fileName', sanitizeFilename('fileName'), async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = path.join(uploadDir, fileName);

    if (!fsSync.existsSync(filePath)) {
      return res.status(404).json({ message: 'file not found' });
    }

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // 使用同步 fs 创建读取流
    const fileStream = fsSync.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('下载文件时出错:', error);
    res.status(500).json({ message: '下载文件失败' });
  }
});

router.delete('/files/:fileName', sanitizeFilename('fileName'), async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = path.join(uploadDir, fileName);

    if (!fsSync.existsSync(filePath)) {
      return res.status(404).json({ message: 'file not found' });
    }

    await fs.unlink(filePath);

    res.json({ message: 'file deleted successfully' });
  } catch (error) {
    logger.error('delete file failed:', error);
    res.status(500).json({ message: 'delete file failed' });
  }
});

module.exports = router;
