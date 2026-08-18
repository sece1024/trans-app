const fs = require('fs');
const logger = require('../config/logger');
const { DATA_DIR, DB_PATH } = require('../config/paths');
const { Database } = require('bun:sqlite');

const dbDir = DATA_DIR;
const dbPath = DB_PATH;

try {
  if (!fs.existsSync(dbDir)) {
    logger.warn('[database]: create dbDir ', dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
  } else {
    logger.info(`dbDir is existed: ${dbDir}`);
  }
} catch (error) {
  logger.error(`Failed to create dbDir: ${error.message}`);
  // 目录创建失败后打开数据库必然失败，直接抛出清晰错误而非放任后续裸异常
  throw new Error(`Failed to create data directory ${dbDir}`, { cause: error });
}

const db = new Database(dbPath);

try {
  // Enable WAL mode for better concurrency
  db.exec('PRAGMA journal_mode = WAL');

  // WAL + synchronous=NORMAL: reduces fsyncs (SD card wear) while staying durable
  // against crashes — at worst the last transaction is lost on power failure.
  db.exec('PRAGMA synchronous = NORMAL');

  // Cap WAL growth so a long-running process cannot balloon it unboundedly.
  db.exec('PRAGMA journal_size_limit = 67108864');

  // Create table if it doesn't exist (compatible with old Sequelize schema)
  db.exec(`
    CREATE TABLE IF NOT EXISTS Contents (
      id TEXT PRIMARY KEY NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deviceInfo TEXT
    )
  `);
} catch (error) {
  db.close();
  throw new Error(`Failed to initialize database ${dbPath}`, { cause: error });
}

module.exports = db;
