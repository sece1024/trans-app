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
      const afterRowid = cursor ? Number.parseInt(cursor, 10) : NaN;
      const rows = Number.isFinite(afterRowid)
        ? ContentItem.findAllAfter(afterRowid, pageSize + 1)
        : ContentItem.findAll({ limit: pageSize + 1 });
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
