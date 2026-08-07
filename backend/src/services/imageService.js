const fs = require('fs/promises');
const fsSync = require('fs');
const BaseService = require('./baseService');

class ImageService extends BaseService {
  async list() {
    if (!fsSync.existsSync(this.uploadDir)) {
      return [];
    }
    const files = await fs.readdir(this.uploadDir);
    return this.sortByTimeDesc(files).map((filename) => ({
      filename,
      originalName: this.getOriginalName(filename),
    }));
  }
}

module.exports = ImageService;
