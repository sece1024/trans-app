const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const BaseService = require('./baseService');

class FileService extends BaseService {
  constructor(uploadDir, { includeSize = false } = {}) {
    super(uploadDir);
    this.includeSize = includeSize;
  }

  async list({ limit, cursor } = {}) {
    if (!fsSync.existsSync(this.uploadDir)) {
      return { items: [], total: 0, hasMore: false, nextCursor: null };
    }
    const files = await fs.readdir(this.uploadDir);
    const sorted = this.sortByTimeDesc(files);
    const total = sorted.length;

    let start = 0;
    if (cursor) {
      const idx = sorted.indexOf(cursor);
      start = idx === -1 ? sorted.length : idx + 1;
    }

    const page = sorted.slice(start, limit ? start + limit : sorted.length);
    const items = await Promise.all(
      page.map(async (file) => {
        const info = { name: file, originalName: this.getOriginalName(file) };
        if (this.includeSize) {
          info.size = (await fs.stat(path.join(this.uploadDir, file))).size;
        }
        return info;
      })
    );
    const hasMore = start + page.length < total;
    const nextCursor = page.length > 0 ? page[page.length - 1] : null;
    return { items, total, hasMore, nextCursor };
  }
}

module.exports = FileService;
