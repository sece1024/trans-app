const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

const isSea = (() => { try { return require('node:sea').isSea(); } catch { return false; } })();

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

// In SEA mode, load the native addon from alongside the executable
let nativeBinding;
if (isSea) {
  const addonPath = path.join(path.dirname(process.execPath), 'better_sqlite3.node');
  const mod = { exports: {} };
  process.dlopen(mod, addonPath);
  nativeBinding = mod.exports;
}

const Database = require('better-sqlite3');
const db = new Database(dbPath, { nativeBinding });

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

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
