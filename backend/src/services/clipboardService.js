const ContentItem = require('../db/ContentItem');

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
      const pageSize = limit || 50;

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

  delete(contentId) {
    try {
      return ContentItem.destroy(contentId);
    } catch (error) {
      throw new Error('Failed to delete clipboard item: ' + contentId, { cause: error });
    }
  }
}

module.exports = new ClipboardService();
