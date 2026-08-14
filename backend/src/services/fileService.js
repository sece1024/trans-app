const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const BaseService = require('./baseService');

class FileService extends BaseService {
  constructor(uploadDir, { includeSize = false } = {}) {
    super(uploadDir);
    this.includeSize = includeSize;
  }

  async list() {
    if (!fsSync.existsSync(this.uploadDir)) {
      return [];
    }
    const files = await fs.readdir(this.uploadDir);
    const infos = await Promise.all(
      this.sortByTimeDesc(files).map(async (file) => {
        const info = { name: file, originalName: this.getOriginalName(file) };
        if (this.includeSize) {
          info.size = (await fs.stat(path.join(this.uploadDir, file))).size;
        }
        return info;
      })
    );
    return infos;
  }
}

module.exports = FileService;
