const clipboardService = require('./clipboardService');
const path = require('path');
const { uploadDir } = require('../config/multer');
const fsSync = require('fs');
const fs = require('fs/promises');
let ip = require('../utils/internet').myIPs;

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
  const imageDir = path.join(uploadDir);
  if (!fsSync.existsSync(imageDir)) {
    return [];
  }

  const files = await fs.readdir(imageDir);
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
