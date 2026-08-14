const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const BaseService = require('./baseService');

class FileService extends BaseService {
  constructor(uploadDir, { includeSize = false } = {}) {
    super(uploadDir);
    this.includeSize = includeSize;
  }

  async list({ limit, offset = 0 } = {}) {
    if (!fsSync.existsSync(this.uploadDir)) {
      return { items: [], total: 0, hasMore: false };
    }
    const files = await fs.readdir(this.uploadDir);
    const sorted = this.sortByTimeDesc(files);
    const total = sorted.length;
    const page = sorted.slice(offset, limit ? offset + limit : sorted.length);
    const items = await Promise.all(
      page.map(async (file) => {
        const info = { name: file, originalName: this.getOriginalName(file) };
        if (this.includeSize) {
          info.size = (await fs.stat(path.join(this.uploadDir, file))).size;
        }
        return info;
      })
    );
    return { items, total, hasMore: offset + page.length < total };
  }
}

module.exports = FileService;
