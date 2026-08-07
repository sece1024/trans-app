const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');

class BaseService {
  constructor(uploadDir) {
    this.uploadDir = uploadDir;
  }

  getFilePath(filename) {
    return path.join(this.uploadDir, filename);
  }

  // 从存储名（`Date.now()-originalName`）反解原始文件名
  getOriginalName(filename) {
    const idx = filename.indexOf('-');
    return idx === -1 ? filename : filename.substring(idx + 1);
  }

  // 从存储名解析上传时间戳（无前缀时视为 0）
  getTimestamp(filename) {
    const idx = filename.indexOf('-');
    const prefix = idx === -1 ? filename : filename.substring(0, idx);
    const ts = Number(prefix);
    return Number.isFinite(ts) ? ts : 0;
  }

  // 按上传时间倒序（新文件在前）
  sortByTimeDesc(filenames) {
    return [...filenames].sort((a, b) => this.getTimestamp(b) - this.getTimestamp(a));
  }

  exists(filename) {
    return fsSync.existsSync(this.getFilePath(filename));
  }

  async delete(filename) {
    const filePath = this.getFilePath(filename);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  }

  async deleteBatch(filenames) {
    const results = await Promise.allSettled(filenames.map((name) => this.delete(name)));
    const deleted = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    const notFound = results.filter((r) => r.status === 'fulfilled' && !r.value).length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return { deleted, notFound, failed };
  }

  createReadStream(filename) {
    return fsSync.createReadStream(this.getFilePath(filename));
  }

  async list() {
    throw new Error('Subclasses must implement list()');
  }
}

module.exports = BaseService;
