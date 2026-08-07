const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');
const { Database } = require('bun:sqlite');

const dbDir = path.join(process.cwd(), 'data');
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

try {
  if (!fs.existsSync(dbDir)) {
    logger.warn('[database]: create dbDir ', dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
  } else {
    logger.info(`dbDir is existed: ${dbDir}`);
  }
} catch (error) {
  logger.error(`Failed to create dbDir: ${error.message}`);
}

const db = new Database(dbPath);

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

module.exports = db;
