const { randomUUID } = require('crypto');
const db = require('./database');
const { MAX_CLIPBOARD_HISTORY: MAX_HISTORY } = require('../config/limits');

// 分类筛选语义（findAll / findAllAfter / count 共用）：
//   undefined = 不筛选（全部）；null = 仅未分类；字符串 = 指定分类
// 同一语义贯穿 DB → service → route，调用方无需拼 SQL。

// Prepared statements (cached for performance)
const insertStmt = db.prepare(`
  INSERT INTO Contents (id, content, type, createdAt, deviceInfo, category)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const selectPageStmt = db.prepare('SELECT rowid, * FROM Contents ORDER BY rowid DESC LIMIT ?');

const selectPageByCategoryStmt = db.prepare(
  'SELECT rowid, * FROM Contents WHERE category = ? ORDER BY rowid DESC LIMIT ?'
);

const selectPageUncategorizedStmt = db.prepare(
  'SELECT rowid, * FROM Contents WHERE category IS NULL ORDER BY rowid DESC LIMIT ?'
);

const selectPageAfterStmt = db.prepare(
  'SELECT rowid, * FROM Contents WHERE rowid < ? ORDER BY rowid DESC LIMIT ?'
);

const selectPageAfterByCategoryStmt = db.prepare(
  'SELECT rowid, * FROM Contents WHERE rowid < ? AND category = ? ORDER BY rowid DESC LIMIT ?'
);

const selectPageAfterUncategorizedStmt = db.prepare(
  'SELECT rowid, * FROM Contents WHERE rowid < ? AND category IS NULL ORDER BY rowid DESC LIMIT ?'
);

const countStmt = db.prepare('SELECT COUNT(*) AS count FROM Contents');

const countByCategoryStmt = db.prepare('SELECT COUNT(*) AS count FROM Contents WHERE category = ?');

const countUncategorizedStmt = db.prepare(
  'SELECT COUNT(*) AS count FROM Contents WHERE category IS NULL'
);

const deleteStmt = db.prepare('DELETE FROM Contents WHERE id = ?');

const updateCategoryStmt = db.prepare('UPDATE Contents SET category = ? WHERE id = ?');

const changesStmt = db.prepare('SELECT changes() AS count');

// 分类汇总：按最近使用排序（MAX(rowid) 越大代表最近有新内容使用该分类）
const categorySummaryStmt = db.prepare(`
  SELECT category AS name, COUNT(*) AS count, MAX(rowid) AS latestRowid
  FROM Contents
  WHERE category IS NOT NULL
  GROUP BY category
  ORDER BY latestRowid DESC
`);

// 删除超出最近 MAX_HISTORY 条的旧记录，防止表无限增长
const pruneStmt = db.prepare(
  `DELETE FROM Contents WHERE id NOT IN (
    SELECT id FROM Contents ORDER BY rowid DESC LIMIT ?
  )`
);

function selectPage(category, limit) {
  if (category === undefined) return selectPageStmt.all(limit);
  if (category === null) return selectPageUncategorizedStmt.all(limit);
  return selectPageByCategoryStmt.all(category, limit);
}

function selectPageAfter(cursor, category, limit) {
  if (category === undefined) return selectPageAfterStmt.all(cursor, limit);
  if (category === null) return selectPageAfterUncategorizedStmt.all(cursor, limit);
  return selectPageAfterByCategoryStmt.all(cursor, category, limit);
}

function countRows(category) {
  if (category === undefined) return countStmt.get().count;
  if (category === null) return countUncategorizedStmt.get().count;
  return countByCategoryStmt.get(category).count;
}

const ContentItem = {
  create({ content, type, deviceInfo, category }) {
    const now = new Date().toISOString();
    const id = randomUUID();
    const normalizedCategory = category || null;
    insertStmt.run(id, content, type, now, deviceInfo || null, normalizedCategory);
    pruneStmt.run(MAX_HISTORY);
    return { id, content, type, createdAt: now, deviceInfo, category: normalizedCategory };
  },

  findAll({ limit = MAX_HISTORY, category } = {}) {
    return selectPage(category, limit);
  },

  findAllAfter(cursor, limit = MAX_HISTORY, category) {
    return selectPageAfter(cursor, category, limit);
  },

  count({ category } = {}) {
    return countRows(category);
  },

  categorySummary() {
    const categories = categorySummaryStmt.all().map(({ name, count }) => ({ name, count }));
    const uncategorized = countUncategorizedStmt.get().count;
    return { categories, uncategorized, total: countStmt.get().count };
  },

  updateCategory(id, category) {
    updateCategoryStmt.run(category ?? null, id);
    return changesStmt.get().count;
  },

  destroy(id) {
    deleteStmt.run(id);
    return changesStmt.get().count;
  },
};

// 导出剪贴板历史上限常量，供路由层/提示引用，避免魔数漂移
ContentItem.MAX_HISTORY = MAX_HISTORY;

module.exports = ContentItem;
