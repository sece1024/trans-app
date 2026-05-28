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
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  }

  createReadStream(filename) {
    return fsSync.createReadStream(this.getFilePath(filename));
  }

  async list() {
    throw new Error('Subclasses must implement list()');
  }
}

module.exports = BaseService;
