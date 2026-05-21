const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const logger = require('../config/logger');

class ImageService {
  constructor(uploadDir) {
    this.uploadDir = uploadDir;
  }

  async list() {
    if (!fsSync.existsSync(this.uploadDir)) {
      return [];
    }
    const files = await fs.readdir(this.uploadDir);
    return files.map((filename) => ({ filename, originalName: filename }));
  }

  getFilePath(filename) {
    return path.join(this.uploadDir, filename);
  }

  exists(filename) {
    return fsSync.existsSync(this.getFilePath(filename));
  }

  async delete(filename) {
    const filePath = this.getFilePath(filename);
    if (!fsSync.existsSync(filePath)) {
      return false;
    }
    await fs.unlink(filePath);
    return true;
  }

  createReadStream(filename) {
    return fsSync.createReadStream(this.getFilePath(filename));
  }
}

module.exports = ImageService;
