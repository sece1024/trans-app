const express = require('express');
const router = express.Router();
const { fileUpload, fileDir: uploadDir } = require('../config/multer');
const logger = require('../config/logger');
const { sanitizeFilename, isValidFilename } = require('../middleware/sanitizeFilename');
const contentDisposition = require('../utils/contentDisposition');
const FileService = require('../services/fileService');

const fileService = new FileService(uploadDir);

// 文件上传路由
router.post('/files/upload', fileUpload.single('file'), (req, res, next) => {
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
    next(error);
  }
});

router.get('/files/:fileName', sanitizeFilename('fileName'), (req, res, next) => {
  try {
    if (!fileService.exists(req.params.fileName)) {
      return res.status(404).json({ message: 'file not found' });
    }
    res.sendFile(fileService.getFilePath(req.params.fileName));
  } catch (error) {
    logger.error('file retrieval failed:', error);
    next(error);
  }
});

router.get('/files', async (req, res, next) => {
  try {
    const fileInfos = await fileService.list();
    res.json(fileInfos);
  } catch (error) {
    logger.error('get files failed:', error);
    next(error);
  }
});

router.get('/download/:fileName', sanitizeFilename('fileName'), (req, res) => {
  const fileName = req.params.fileName;

  res.setHeader('Content-Disposition', contentDisposition(fileService.getOriginalName(fileName)));
  res.setHeader('Content-Type', 'application/octet-stream');
  const stream = fileService.createReadStream(fileName);
  stream.on('error', (err) => {
    logger.error('file stream error:', err);
    if (!res.headersSent) {
      return err.code === 'ENOENT'
        ? res.status(404).json({ message: 'file not found' })
        : res.status(500).json({ message: 'download failed' });
    }
    res.destroy(err);
  });
  stream.pipe(res);
});

router.delete('/files', async (req, res, next) => {
  try {
    const { filenames } = req.body;
    if (!Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ message: 'filenames array is required' });
    }
    if (filenames.some((name) => !isValidFilename(name))) {
      return res.status(400).json({ message: 'invalid filename' });
    }
    const result = await fileService.deleteBatch(filenames);
    res.json({ message: `${result.deleted} files deleted`, ...result });
  } catch (error) {
    logger.error('batch delete files failed:', error);
    next(error);
  }
});

router.delete('/files/:fileName', sanitizeFilename('fileName'), async (req, res, next) => {
  try {
    const deleted = await fileService.delete(req.params.fileName);
    if (!deleted) {
      return res.status(404).json({ message: 'file not found' });
    }
    res.json({ message: 'file deleted successfully' });
  } catch (error) {
    logger.error('delete file failed:', error);
    next(error);
  }
});

module.exports = router;
