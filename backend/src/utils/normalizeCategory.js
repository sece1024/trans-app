const { MAX_CATEGORY_LENGTH } = require('../config/limits');

/**
 * 归一化用户输入的分类名：Unicode NFC + 折叠连续空白为单个空格 + 去除首尾空格。
 * 空串 / 纯空白 / null / undefined 表示「未分类」，统一归一为 null。
 *
 * NFC 是分类的「身份」前提：同一个名字用组合字符（macOS 粘贴常见）与预组合字符
 * 写出来是两个不同的字符串，不归一就会在精确匹配下变成两个分类。大小写不在这里
 * 折叠（会改变显示名），由 SQL 的 `COLLATE NOCASE` 与写入口的 resolveCategory 处理。
 *
 * @param {unknown} value 原始分类值
 * @returns {string|null} 归一化后的分类名；未分类时为 null
 * @throws {TypeError} 非字符串输入，或归一化后超过 MAX_CATEGORY_LENGTH
 */
function normalizeCategory(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new TypeError('Invalid category');
  }
  const normalized = value.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  if (normalized.length > MAX_CATEGORY_LENGTH) {
    throw new TypeError('Category too long');
  }
  return normalized;
}

module.exports = normalizeCategory;
