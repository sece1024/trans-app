const { MAX_CATEGORY_LENGTH } = require('../config/limits');

/**
 * 归一化用户输入的分类名：折叠连续空白为单个空格并去除首尾空格。
 * 空串 / 纯空白 / null / undefined 表示「未分类」，统一归一为 null。
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
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  if (normalized.length > MAX_CATEGORY_LENGTH) {
    throw new TypeError('Category too long');
  }
  return normalized;
}

module.exports = normalizeCategory;
