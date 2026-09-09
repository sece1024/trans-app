const express = require('express');
const logger = require('../config/logger');
const { sanitizeFilename, isValidFilename } = require('../middleware/sanitizeFilename');
const contentDisposition = require('../utils/contentDisposition');
const decodeFilename = require('../utils/decodeFilename');
const pipeStream = require('../utils/streamResponse');
const parsePagination = require('../utils/pagination');
const requireDiskSpace = require('../middleware/requireDiskSpace');

/**
 * 文件 / 图片共用的 CRUD 路由工厂，消除两个路由文件的重复逻辑。
 * 生成的接口：
 *   POST   {basePath}/upload            上传（multer 单文件）
 *   GET    {basePath}                   分页列表
 *   GET    {downloadPath}               下载（attachment）
 *   GET    {basePath}/:filename         内联读取（CSP sandbox 防 HTML/SVG 执行）
 *   DELETE {basePath}/:filename         单个删除
 *   DELETE {basePath}                   批量删除（仅 opts.batchDelete 时挂载）
 *
 * @param {Object} opts
 * @param {string} opts.basePath         资源路径前缀，如 '/files'
 * @param {Object} opts.upload           multer 上传实例（fileUpload / imageUpload）
 * @param {string} opts.uploadField      表单字段名，如 'file' / 'image'
 * @param {string} opts.uploadDir        上传目录
 * @param {number} opts.maxSize          上传前磁盘空间检查阈值
 * @param {Object} opts.service          FileService 实例
 * @param {string} [opts.downloadPath]   下载路径，默认 `${basePath}/download/:filename`
 * @param {boolean} [opts.batchDelete]   是否挂载批量删除（仅文件有此接口）
 * @param {string} [opts.resourceName]   日志与提示中的资源名，默认 'file'
 */
function buildCrudRouter({
  basePath,
  upload,
  uploadField,
  uploadDir,
  maxSize,
  service,
  downloadPath = `${basePath}/download/:filename`,
  batchDelete = false,
  resourceName = 'file',
}) {
  const router = express.Router();
  const notFoundMessage = `${resourceName} not found`;

  // 上传
  router.post(
    `${basePath}/upload`,
    requireDiskSpace(uploadDir, maxSize),
    upload.single(uploadField),
    (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: notFoundMessage });
        }
        const originalName = decodeFilename(req.file.originalname);
        res.json({
          message: `${resourceName} upload success`,
          filename: req.file.filename,
          originalName,
        });
      } catch (error) {
        logger.error(`${resourceName} upload failed:`, error);
        next(error);
      }
    }
  );

  // 列表
  router.get(basePath, async (req, res, next) => {
    try {
      const { limit, cursor } = parsePagination(req.query);
      res.json(await service.list({ limit, cursor }));
    } catch (error) {
      logger.error(`get ${resourceName} list failed:`, error);
      next(error);
    }
  });

  // 下载——必须先于动态 :filename 路由注册，否则 /download/xxx 会被内联路由吞掉
  router.get(downloadPath, sanitizeFilename('filename'), (req, res) => {
    const { filename } = req.params;
    res.setHeader('Content-Disposition', contentDisposition(service.getOriginalName(filename)));
    res.setHeader('Content-Type', 'application/octet-stream');
    pipeStream(service.createReadStream(filename), res, notFoundMessage);
  });

  // 内联读取（带 CSP sandbox，防止上传的 HTML/SVG 在同源下执行脚本）
  router.get(`${basePath}/:filename`, sanitizeFilename('filename'), (req, res, next) => {
    try {
      if (!service.exists(req.params.filename)) {
        return res.status(404).json({ message: notFoundMessage });
      }
      res.setHeader('Content-Security-Policy', 'sandbox');
      res.sendFile(service.getFilePath(req.params.filename));
    } catch (error) {
      logger.error(`${resourceName} retrieval failed:`, error);
      next(error);
    }
  });

  // 批量删除（仅文件有）
  if (batchDelete) {
    router.delete(basePath, async (req, res, next) => {
      try {
        const { filenames } = req.body;
        if (!Array.isArray(filenames) || filenames.length === 0) {
          return res.status(400).json({ message: 'filenames array is required' });
        }
        if (filenames.some((name) => !isValidFilename(name))) {
          return res.status(400).json({ message: 'invalid filename' });
        }
        const result = await service.deleteBatch(filenames);
        res.json({ message: `${result.deleted} files deleted`, ...result });
      } catch (error) {
        logger.error('batch delete failed:', error);
        next(error);
      }
    });
  }

  // 单个删除
  router.delete(`${basePath}/:filename`, sanitizeFilename('filename'), async (req, res, next) => {
    try {
      const deleted = await service.delete(req.params.filename);
      if (!deleted) {
        return res.status(404).json({ message: notFoundMessage });
      }
      res.json({ message: `${resourceName} deleted successfully` });
    } catch (error) {
      logger.error(`delete ${resourceName} failed:`, error);
      next(error);
    }
  });

  return router;
}

module.exports = { buildCrudRouter };
