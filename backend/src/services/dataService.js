const clipboardService = require('./clipboardService');
const path = require('path');
const { uploadDir } = require('../config/multer');
const fsSync = require('fs');
const fs = require('fs/promises');
const ip = require('../utils/internet').myIPs;

const imageUploadDir = path.join(process.cwd(), 'data/uploads/images');

const getLocalText = async () => clipboardService.getTextHistory();
const getLocalFiles = async () => {
  const fileDir = path.join(uploadDir);
  if (!fsSync.existsSync(fileDir)) {
    return [];
  }
  const files = await fs.readdir(fileDir);
  const fileInfos = [];
  for (const file of files) {
    const filePath = path.join(fileDir, file);
    const stats = await fs.stat(filePath);
    fileInfos.push({
      type: 'file',
      name: file,
      sizeInMB: (stats.size / (1024 * 1024)).toFixed(1),
    });
  }
  return fileInfos;
};
const getLocalImages = async () => {
  if (!fsSync.existsSync(imageUploadDir)) {
    return [];
  }

  const files = await fs.readdir(imageUploadDir);
  return files.map((filename) => ({
    type: 'image',
    name: filename,
  }));
};
const getLocalData = async () => {
  return {
    ip,
    data: {
      textData: await getLocalText(),
      fileData: await getLocalFiles(),
      imageData: await getLocalImages(),
    },
  };
};

module.exports = {
  getLocalText,
  getLocalFiles,
  getLocalImages,
  getLocalData,
};
