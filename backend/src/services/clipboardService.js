const ContentItem = require('../db/ContentItem');

class ClipboardService {
  saveTextContent(content, type, deviceInfo) {
    try {
      return ContentItem.create({ content, type, deviceInfo });
    } catch (error) {
      throw new Error('Failed to save clipboard', { cause: error });
    }
  }

  getTextHistory({ limit, offset } = {}) {
    try {
      const items = ContentItem.findAll({ limit, offset });
      const total = ContentItem.count();
      return { items, total, hasMore: (offset || 0) + items.length < total };
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
