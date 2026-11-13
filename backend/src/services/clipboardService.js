const ContentItem = require('../db/ContentItem');
const { DEFAULT_PAGE_SIZE } = require('../utils/pagination');

class ClipboardService {
  saveTextContent(content, type, deviceInfo, category) {
    try {
      return ContentItem.create({ content, type, deviceInfo, category });
    } catch (error) {
      throw new Error('Failed to save clipboard', { cause: error });
    }
  }

  // category 三态（与 ContentItem 一致）：undefined = 全部，null = 未分类，字符串 = 指定分类
  getTextHistory({ limit, cursor, category } = {}) {
    try {
      const total = ContentItem.count({ category });
      const pageSize = limit || DEFAULT_PAGE_SIZE;

      let rows;
      if (cursor === undefined) {
        rows = ContentItem.findAll({ limit: pageSize + 1, category });
      } else {
        const afterRowid = Number.parseInt(cursor, 10);
        if (!Number.isFinite(afterRowid)) {
          // 非法 cursor 返回空页（与文件列表行为一致），
          // 而非解析失败回退第一页造成重复追加
          return { items: [], total, hasMore: false, nextCursor: null };
        }
        rows = ContentItem.findAllAfter(afterRowid, pageSize + 1, category);
      }

      const hasMore = rows.length > pageSize;
      const items = rows.slice(0, pageSize);
      const nextCursor = items.length ? items[items.length - 1].rowid : null;
      return { items, total, hasMore, nextCursor };
    } catch (error) {
      throw new Error('Failed to get clipboard history', { cause: error });
    }
  }

  getCategorySummary() {
    try {
      return ContentItem.categorySummary();
    } catch (error) {
      throw new Error('Failed to get clipboard categories', { cause: error });
    }
  }

  updateCategory(contentId, category) {
    try {
      return ContentItem.updateCategory(contentId, category);
    } catch (error) {
      throw new Error('Failed to update clipboard category: ' + contentId, { cause: error });
    }
  }

  /**
   * 重命名一个分类，返回受影响的条目数；目标分类已存在时等价于合并。
   *
   * @param {string} from 原分类名（已归一化）
   * @param {string} to   新分类名（已归一化）
   * @returns {number} 受影响行数，0 表示原分类不存在
   */
  renameCategory(from, to) {
    try {
      return ContentItem.renameCategory(from, to);
    } catch (error) {
      throw new Error('Failed to rename clipboard category: ' + from, { cause: error });
    }
  }

  /**
   * 把某分类下的所有条目改为未分类，返回受影响的条目数。
   *
   * @param {string} name 分类名（已归一化）
   * @returns {number} 受影响行数
   */
  clearCategory(name) {
    try {
      return ContentItem.clearCategory(name);
    } catch (error) {
      throw new Error('Failed to clear clipboard category: ' + name, { cause: error });
    }
  }

  delete(contentId) {
    try {
      return ContentItem.destroy(contentId);
    } catch (error) {
      throw new Error('Failed to delete clipboard item: ' + contentId, { cause: error });
    }
  }
}

module.exports = new ClipboardService();
