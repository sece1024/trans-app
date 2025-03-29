const fs = require('fs');
const logger = require('../config/logger');

const printDir = (dir) => {
  logger.info(`[tools] print dir ${dir}`);
  try {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      logger.info(file);
    });
  } catch (err) {
    logger.error('读取目录失败:', err);
  }
};

module.exports = printDir;
