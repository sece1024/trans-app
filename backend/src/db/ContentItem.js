const { randomUUID } = require('crypto');
const db = require('./database');
const { MAX_CLIPBOARD_HISTORY: MAX_HISTORY } = require('../config/limits');

// 分类筛选语义（findAll / findAllAfter / count 共用）：
//   undefined = 不筛选（全部）；null = 仅未分类；字符串 = 指定分类
// 同一语义贯穿 DB → service → route，调用方无需拼 SQL。
//
// 分类的「身份」忽略大小写（`COLLATE NOCASE`）：Link / link 是同一个分类。
// 过去它们是两个分类，用户随手写就分裂成两个 chip，归到同一个分类还得逐条改。
// 显示名由该分类下最新一条的写法决定（见 categorySummary / resolveCategory）。

// Prepared statements (cached for performance)
const insertStmt = db.prepare(`
  INSERT INTO Contents (id, content, type, createdAt, deviceInfo, category)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const selectPageStmt = db.prepare('SELECT rowid, * FROM Contents ORDER BY rowid DESC LIMIT ?');

const selectPageByCategoryStmt = db.prepare(
  'SELECT rowid, * FROM Contents WHERE category = ? COLLATE NOCASE ORDER BY rowid DESC LIMIT ?'
);

const selectPageUncategorizedStmt = db.prepare(
  'SELECT rowid, * FROM Contents WHERE category IS NULL ORDER BY rowid DESC LIMIT ?'
);

const selectPageAfterStmt = db.prepare(
  'SELECT rowid, * FROM Contents WHERE rowid < ? ORDER BY rowid DESC LIMIT ?'
);

const selectPageAfterByCategoryStmt = db.prepare(
  'SELECT rowid, * FROM Contents WHERE rowid < ? AND category = ? COLLATE NOCASE ORDER BY rowid DESC LIMIT ?'
);

const selectPageAfterUncategorizedStmt = db.prepare(
  'SELECT rowid, * FROM Contents WHERE rowid < ? AND category IS NULL ORDER BY rowid DESC LIMIT ?'
);

const countStmt = db.prepare('SELECT COUNT(*) AS count FROM Contents');

const countByCategoryStmt = db.prepare(
  'SELECT COUNT(*) AS count FROM Contents WHERE category = ? COLLATE NOCASE'
);

const countUncategorizedStmt = db.prepare(
  'SELECT COUNT(*) AS count FROM Contents WHERE category IS NULL'
);

const deleteStmt = db.prepare('DELETE FROM Contents WHERE id = ?');

const updateCategoryStmt = db.prepare('UPDATE Contents SET category = ? WHERE id = ?');

// 分类级操作：一次改一批条目（重命名 / 合并 / 清空到未分类），同样忽略大小写
const renameCategoryStmt = db.prepare(
  'UPDATE Contents SET category = ? WHERE category = ? COLLATE NOCASE'
);

const clearCategoryStmt = db.prepare(
  'UPDATE Contents SET category = NULL WHERE category = ? COLLATE NOCASE'
);

// 分类的显示名：该分类下最新一条内容用的是哪种写法（大小写只影响显示，不影响身份）
const selectDisplayNameStmt = db.prepare(
  'SELECT category AS name FROM Contents WHERE category = ? COLLATE NOCASE ORDER BY rowid DESC LIMIT 1'
);

// 全量扫描（表只保留最近 MAX_HISTORY 条）+ JS 聚合，见 categorySummary()
const selectCategoryRowsStmt = db.prepare(
  'SELECT rowid, category FROM Contents ORDER BY rowid DESC'
);

const changesStmt = db.prepare('SELECT changes() AS count');

// 删除超出最近 MAX_HISTORY 条的旧记录，防止表无限增长
const pruneStmt = db.prepare(
  `DELETE FROM Contents WHERE id NOT IN (
    SELECT id FROM Contents ORDER BY rowid DESC LIMIT ?
  )`
);

/**
 * 把新写入的分类名收敛到已有写法：库里已有 `Link` 时，用户写 `link` 沿用 `Link`。
 * 这一步保证「大小写不同」不会在库里分化成两个分类，同时让显示名保持稳定。
 *
 * @param {string|null} name 已归一化的分类名
 * @returns {string|null}
 */
function resolveCategory(name) {
  if (!name) return null;
  return selectDisplayNameStmt.get(name)?.name ?? name;
}

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
    const normalizedCategory = resolveCategory(category || null);
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
    // 在 JS 里聚合而不是 SQL `GROUP BY category`：后者区分大小写，会把 Link / link
    // 拆成两组；显示名取该组最新一条的写法，顺序即最近使用顺序。
    // 表只保留最近 MAX_HISTORY 条，全量扫描的成本可忽略。
    const rows = selectCategoryRowsStmt.all();
    const groups = new Map();
    let uncategorized = 0;

    for (const { category } of rows) {
      if (!category) {
        uncategorized += 1;
        continue;
      }
      const key = category.toLowerCase();
      const group = groups.get(key);
      if (group) group.count += 1;
      else groups.set(key, { name: category, count: 1 });
    }

    return { categories: [...groups.values()], uncategorized, total: rows.length };
  },

  updateCategory(id, category) {
    updateCategoryStmt.run(resolveCategory(category ?? null), id);
    return changesStmt.get().count;
  },

  // 重命名一个分类；目标名已存在（忽略大小写）即合并，并沿用目标已有的写法。
  // 只改大小写是合法操作：此时匹配到的「已有分类」就是它自己，保留用户输入的新写法。
  renameCategory(from, to) {
    const existing = selectDisplayNameStmt.get(to)?.name;
    const isSelf = existing ? existing.toLowerCase() === from.toLowerCase() : false;
    renameCategoryStmt.run(existing && !isSelf ? existing : to, from);
    return changesStmt.get().count;
  },

  // 把某分类下的所有条目改为未分类（分类本身不需要单独的行存在）
  clearCategory(name) {
    clearCategoryStmt.run(name);
    return changesStmt.get().count;
  },

  destroy(id) {
    deleteStmt.run(id);
    return changesStmt.get().count;
  },
};

module.exports = ContentItem;
