const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const BaseService = require('./baseService');

class FileService extends BaseService {
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
        size: stats.size,
        sizeInMB: (stats.size / (1024 * 1024)).toFixed(1),
      });
    }
    return fileInfos;
  }
}

module.exports = FileService;
