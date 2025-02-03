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
    const fileInfo = {
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadTime: new Date()
    };
    this.uploadedFiles.set(file.originalname, fileInfo);
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