const express = require('express');
const router = express.Router();
const {upload, uploadDir} = require('../config/multer');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const logger = require('../config/logger');

// 文件上传路由
router.post('/files/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({message: 'file not found'});
        }

        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

        res.json({
            message: 'file upload success!',
            fileId: originalName
        });
    } catch (error) {
        logger.error('file upload failed:', error);
        res.status(500).json({
            message: 'file upload failed',
            error: error.message
        });
    }
});

router.get('/files/:fileName', async (req, res) => {
    try {
        const filePath = path.join(uploadDir, req.params.fileName);

        if (!fsSync.existsSync(filePath)) {
            return res.status(404).json({message: 'file not found'});
        }

        res.sendFile(filePath);
    } catch (error) {
        logger.error('file upload failed:', error);
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
        fileInfos.push({
            name: file,
            sizeInMB: (stats.size / (1024 * 1024)).toFixed(1),
        });
    }

    res.json(fileInfos);
});

// router.get('/files/:fileId/preview', async (req, res) => {
//   try {
//     const fileId = req.params.fileId;
//     const fileInfo = fileService.getFile(fileId);
//
//     if (!fileInfo) {
//       return res.status(404).json({
//         message: '文件未找到'
//       });
//     }
//
//     // 检查 MIME 类型
//     if (fileInfo.mimetype !== 'text/plain') {
//       return res.status(400).json({
//         message: '只支持预览文本文件'
//       });
//     }
//
//     // 读取文件内容
//     const content = await fs.readFile(fileInfo.path, 'utf8');
//
//     // 如果文件太大，只返回前1000个字符
//     const MAX_PREVIEW_LENGTH = 1000;
//     const truncated = content.length > MAX_PREVIEW_LENGTH;
//     const previewContent = truncated
//       ? content.slice(0, MAX_PREVIEW_LENGTH) + '\n... (内容已截断)'
//       : content;
//
//     // 返回预览内容
//     res.json({
//       content: previewContent,
//       truncated: truncated
//     });
//
//   } catch (error) {
//     logger.error('预览文件失败:', error);
//     res.status(500).json({
//       message: '预览文件失败',
//       error: error.message
//     });
//   }
// });

router.get('/download/:fileName', async (req, res) => {
    try {
        const fileName = req.params.fileName;
        const filePath = path.join(uploadDir, fileName);

        if (!fsSync.existsSync(filePath)) {
            return res.status(404).json({message: 'file not found'});
        }

        // 设置响应头
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // 使用同步 fs 创建读取流
        const fileStream = fsSync.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        logger.error('下载文件时出错:', error);
        res.status(500).json({message: '下载文件失败'});
    }
});

module.exports = router; 