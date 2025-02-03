const fs = require('fs');
const path = require('path');

class FileService {
  constructor() {
    this.uploadedFiles = new Map();
    this.ensureUploadDirectory();
  }

  ensureUploadDirectory() {
    if (!fs.existsSync('uploads/')) {
      fs.mkdirSync('uploads/');
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