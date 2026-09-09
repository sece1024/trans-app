const { imageUpload, imageDir: uploadDir, MAX_IMAGE_SIZE } = require('../config/multer');
const FileService = require('../services/fileService');
const { buildCrudRouter } = require('./crudRouter');

const imageService = new FileService(uploadDir);

// 图片 CRUD 路由
module.exports = buildCrudRouter({
  basePath: '/images',
  upload: imageUpload,
  uploadField: 'image',
  uploadDir,
  maxSize: MAX_IMAGE_SIZE,
  service: imageService,
  resourceName: 'image',
});
