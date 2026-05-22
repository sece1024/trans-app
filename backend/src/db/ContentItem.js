const { randomUUID } = require('crypto');
const db = require('./database');

// Prepared statements (cached for performance)
const insertStmt = db.prepare(`
  INSERT INTO Contents (id, content, type, createdAt, updatedAt, deviceInfo)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const selectAllStmt = db.prepare(
  'SELECT * FROM Contents ORDER BY createdAt DESC'
);

const deleteStmt = db.prepare('DELETE FROM Contents WHERE id = ?');

const ContentItem = {
  create({ content, type, deviceInfo }) {
    const now = new Date().toISOString();
    const id = randomUUID();
    insertStmt.run(id, content, type, now, now, deviceInfo || null);
    return { id, content, type, createdAt: now, updatedAt: now, deviceInfo };
  },

  findAll() {
    return selectAllStmt.all();
  },

  destroy(id) {
    const result = deleteStmt.run(id);
    return result.changes;
  },
};

module.exports = ContentItem;
