const fs = require('fs');
const path = require('path');

class CleanupService {
  constructor(fileService) {
    this.fileService = fileService;
    this.maxAge = 1000 * 60 * 60; // 1小时
  }

  startCleanupTask() {
    const CLEANUP_INTERVAL = 1000 * 60 * 30; // 30分钟
    setInterval(() => this.cleanup(), CLEANUP_INTERVAL);
  }

  cleanup() {
    const now = Date.now();
    const uploadedFiles = this.fileService.getUploadedFiles();

    // 清理内存中的记录
    for (const [fileId, fileInfo] of uploadedFiles.entries()) {
      if (now - fileInfo.uploadTime.getTime() > this.maxAge) {
        this.deleteFile(fileInfo.path);
        uploadedFiles.delete(fileId);
      }
    }

    // 清理孤立文件
    this.cleanupOrphanedFiles();
  }

  deleteFile(filePath) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`删除文件失败: ${filePath}`, err);
      } else {
        console.log(`已删除过期文件: ${filePath}`);
      }
    });
  }

  cleanupOrphanedFiles() {
    fs.readdir('uploads/', (err, files) => {
      if (err) {
        console.error('读取目录失败:', err);
        return;
      }

      this.processOrphanedFiles(files);
    });
  }

  processOrphanedFiles(files) {
    const now = Date.now();
    const uploadedFiles = this.fileService.getUploadedFiles();

    files.forEach(file => {
      const filePath = path.join('uploads/', file);
      this.checkAndDeleteOrphanedFile(filePath, uploadedFiles, now);
    });
  }

  checkAndDeleteOrphanedFile(filePath, uploadedFiles, now) {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        console.error(`获取文件状态失败: ${filePath}`, err);
        return;
      }

      if (now - stats.mtime.getTime() > this.maxAge) {
        const isTracked = Array.from(uploadedFiles.values())
          .some(fileInfo => fileInfo.path === filePath);

        if (!isTracked) {
          this.deleteFile(filePath);
        }
      }
    });
  }
}

module.exports = CleanupService; 