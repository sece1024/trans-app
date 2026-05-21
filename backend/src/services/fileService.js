const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const logger = require('../config/logger');

class FileService {
  constructor(uploadDir) {
    this.uploadDir = uploadDir;
  }

  async list() {
    if (!fsSync.existsSync(this.uploadDir)) {
      return [];
    }
    const files = await fs.readdir(this.uploadDir);
    const fileInfos = [];
    for (const file of files) {
      const filePath = path.join(this.uploadDir, file);
      const stats = await fs.stat(filePath);
      const originalName = file.includes('-') ? file.substring(file.indexOf('-') + 1) : file;
      fileInfos.push({
        name: file,
        originalName,
        sizeInMB: (stats.size / (1024 * 1024)).toFixed(1),
      });
    }
    return fileInfos;
  }

  getFilePath(fileName) {
    return path.join(this.uploadDir, fileName);
  }

  exists(fileName) {
    return fsSync.existsSync(this.getFilePath(fileName));
  }

  async delete(fileName) {
    const filePath = this.getFilePath(fileName);
    if (!fsSync.existsSync(filePath)) {
      return false;
    }
    await fs.unlink(filePath);
    return true;
  }

  createReadStream(fileName) {
    return fsSync.createReadStream(this.getFilePath(fileName));
  }
}

module.exports = FileService;
