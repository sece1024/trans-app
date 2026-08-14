const { randomUUID } = require('crypto');
const db = require('./database');

// Prepared statements (cached for performance)
const insertStmt = db.prepare(`
  INSERT INTO Contents (id, content, type, createdAt, updatedAt, deviceInfo)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const selectPageStmt = db.prepare('SELECT rowid, * FROM Contents ORDER BY rowid DESC LIMIT ?');

const selectPageAfterStmt = db.prepare(
  'SELECT rowid, * FROM Contents WHERE rowid < ? ORDER BY rowid DESC LIMIT ?'
);

const countStmt = db.prepare('SELECT COUNT(*) AS count FROM Contents');

const deleteStmt = db.prepare('DELETE FROM Contents WHERE id = ?');

const changesStmt = db.prepare('SELECT changes() AS count');

// 删除超出最近 MAX_HISTORY 条的旧记录，防止表无限增长
const pruneStmt = db.prepare(
  `DELETE FROM Contents WHERE id NOT IN (
    SELECT id FROM Contents ORDER BY rowid DESC LIMIT ?
  )`
);

const MAX_HISTORY = 50;

const ContentItem = {
  create({ content, type, deviceInfo }) {
    const now = new Date().toISOString();
    const id = randomUUID();
    insertStmt.run(id, content, type, now, now, deviceInfo || null);
    pruneStmt.run(MAX_HISTORY);
    return { id, content, type, createdAt: now, updatedAt: now, deviceInfo };
  },

  findAll({ limit = MAX_HISTORY } = {}) {
    return selectPageStmt.all(limit);
  },

  findAllAfter(cursor, limit = MAX_HISTORY) {
    return selectPageAfterStmt.all(cursor, limit);
  },

  count() {
    return countStmt.get().count;
  },

  destroy(id) {
    deleteStmt.run(id);
    return changesStmt.get().count;
  },
};

module.exports = ContentItem;
