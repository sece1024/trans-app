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

  async list() {
    throw new Error('Subclasses must implement list()');
  }
}

module.exports = BaseService;
