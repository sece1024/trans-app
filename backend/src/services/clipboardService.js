const ContentItem = require('../db/ContentItem');

class ClipboardService {
  saveTextContent(content, type, deviceInfo) {
    try {
      return ContentItem.create({ content, type, deviceInfo });
    } catch (error) {
      throw new Error('Failed to save clipboard', { cause: error });
    }
  }

  getTextHistory({ limit, cursor } = {}) {
    try {
      const total = ContentItem.count();
      const pageSize = limit || 50;

      let rows;
      if (cursor === undefined) {
        rows = ContentItem.findAll({ limit: pageSize + 1 });
      } else {
        const afterRowid = Number.parseInt(cursor, 10);
        if (!Number.isFinite(afterRowid)) {
          // 非法 cursor 返回空页（与文件列表行为一致），
          // 而非解析失败回退第一页造成重复追加
          return { items: [], total, hasMore: false, nextCursor: null };
        }
        rows = ContentItem.findAllAfter(afterRowid, pageSize + 1);
      }

      const hasMore = rows.length > pageSize;
      const items = rows.slice(0, pageSize);
      const nextCursor = items.length ? items[items.length - 1].rowid : null;
      return { items, total, hasMore, nextCursor };
    } catch (error) {
      throw new Error('Failed to get clipboard history', { cause: error });
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
