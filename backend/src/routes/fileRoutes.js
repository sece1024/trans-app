const express = require('express');
const router = express.Router();
const { fileUpload, fileDir: uploadDir } = require('../config/multer');
const logger = require('../config/logger');
const { sanitizeFilename } = require('../middleware/sanitizeFilename');
const FileService = require('../services/fileService');

const fileService = new FileService(uploadDir);

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
      originalName,
    });
  } catch (error) {
    logger.error('file upload failed:', error);
    res.status(500).json({ message: 'file upload failed' });
  }
});

router.get('/files/:fileName', sanitizeFilename('fileName'), async (req, res) => {
  try {
    if (!fileService.exists(req.params.fileName)) {
      return res.status(404).json({ message: 'file not found' });
    }
    res.sendFile(fileService.getFilePath(req.params.fileName));
  } catch (error) {
    logger.error('file retrieval failed:', error);
    res.status(500).json({ message: 'file retrieval failed' });
  }
});

router.get('/files', async (req, res) => {
  try {
    const fileInfos = await fileService.list();
    res.json(fileInfos);
  } catch (error) {
    logger.error('get files failed:', error);
    res.status(500).json({ message: 'get files failed' });
  }
});

router.get('/download/:fileName', sanitizeFilename('fileName'), async (req, res) => {
  try {
    const fileName = req.params.fileName;
    if (!fileService.exists(fileName)) {
      return res.status(404).json({ message: 'file not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    const stream = fileService.createReadStream(fileName);
    stream.on('error', (err) => {
      logger.error('file stream error:', err);
      if (!res.headersSent) res.status(500).json({ message: '下载文件失败' });
      else res.destroy(err);
    });
    stream.pipe(res);
  } catch (error) {
    logger.error('下载文件时出错:', error);
    res.status(500).json({ message: '下载文件失败' });
  }
});

router.delete('/files/:fileName', sanitizeFilename('fileName'), async (req, res) => {
  try {
    const deleted = await fileService.delete(req.params.fileName);
    if (!deleted) {
      return res.status(404).json({ message: 'file not found' });
    }
    res.json({ message: 'file deleted successfully' });
  } catch (error) {
    logger.error('delete file failed:', error);
    res.status(500).json({ message: 'delete file failed' });
  }
});

module.exports = router;
