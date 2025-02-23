const logger = require('pino')();
const path = require('path');
const fs = require('fs');
const outputDir = path.join(process.cwd(), 'uploads');

class FileService {
  constructor() {
    this.uploadedFiles = new Map();
    this.ensureUploadDirectory();
  }

  ensureUploadDirectory() {
    if (!fs.existsSync(outputDir)) {
      logger.info('output dir not exist');
    }
  }

  saveFile(file) {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    const fileInfo = {
      originalName: originalName,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadTime: new Date()
    };
    
    this.uploadedFiles.set(originalName, fileInfo);
    return fileInfo;
  }

  getFile(fileId) {
    return this.uploadedFiles.get(fileId);
  }

  getAllFiles() {
    return Array.from(this.uploadedFiles.values());
  }

  getUploadedFiles() {
    return this.uploadedFiles;
  }
}

module.exports = new FileService(); 