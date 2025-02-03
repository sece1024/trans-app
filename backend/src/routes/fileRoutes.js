const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const fileService = require('../services/fileService');
const fs = require('fs').promises;  // 使用 promises 版本的 fs

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '没有文件被上传' });
  }

  res.json({ 
    message: '文件上传成功!',
    fileId: req.file.originalname
  });
});


router.get('/files/:fileId', async (req, res) => {
  const fileInfo = fileService.getFile(req.params.fileId);
  if (!fileInfo) {
    return res.status(404).json({ message: '文件未找到' });
  }
  if (fileInfo.mimetype === 'text/plain') {
    const content = await fs.readFile(fileInfo.path, 'utf8');
    res.json({ content });
  } else {
    res.json({ message: `${fileInfo.mimetype} 文件不是文本文件` });
  }
});

router.get('/files', (req, res) => {
  res.json(fileService.getAllFiles());
});


router.get('/files/:fileId/preview', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const fileInfo = fileService.getFile(fileId);
    
    if (!fileInfo) {
      return res.status(404).json({ 
        message: '文件未找到'
      });
    }

    // 检查 MIME 类型
    if (fileInfo.mimetype !== 'text/plain') {
      return res.status(400).json({ 
        message: '只支持预览文本文件'
      });
    }

    // 读取文件内容
    const content = await fs.readFile(fileInfo.path, 'utf8');
    
    // 如果文件太大，只返回前1000个字符
    const MAX_PREVIEW_LENGTH = 1000;
    const truncated = content.length > MAX_PREVIEW_LENGTH;
    const previewContent = truncated 
      ? content.slice(0, MAX_PREVIEW_LENGTH) + '\n... (内容已截断)'
      : content;

    // 返回预览内容
    res.json({ 
      content: previewContent,
      truncated: truncated
    });

  } catch (error) {
    console.error('预览文件失败:', error);
    res.status(500).json({ 
      message: '预览文件失败', 
      error: error.message 
    });
  }
});

module.exports = router; 