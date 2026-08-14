const path = require('path');

// 运行时数据根目录，可通过 DATA_DIR 环境变量覆盖（默认 process.cwd()/data）
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');

module.exports = {
  DATA_DIR,
  DB_PATH: path.join(DATA_DIR, 'database.sqlite'),
  UPLOAD_BASE: path.join(DATA_DIR, 'uploads'),
};
