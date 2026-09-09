const { fileUpload, fileDir: uploadDir, MAX_FILE_SIZE } = require('../config/multer');
const FileService = require('../services/fileService');
const { buildCrudRouter } = require('./crudRouter');

const fileService = new FileService(uploadDir, { includeSize: true });

// 文件 CRUD 路由。注意下载路径沿用历史 API：/api/download/:fileName（无 /files 前缀）
module.exports = buildCrudRouter({
  basePath: '/files',
  upload: fileUpload,
  uploadField: 'file',
  uploadDir,
  maxSize: MAX_FILE_SIZE,
  service: fileService,
  downloadPath: '/download/:filename',
  batchDelete: true,
  resourceName: 'file',
});
