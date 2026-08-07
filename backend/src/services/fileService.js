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
    const fileInfos = await Promise.all(
      this.sortByTimeDesc(files).map(async (file) => {
        const stats = await fs.stat(path.join(this.uploadDir, file));
        return {
          name: file,
          originalName: this.getOriginalName(file),
          size: stats.size,
        };
      })
    );
    return fileInfos;
  }
}

module.exports = FileService;
