const ContentItem = require('../db/ContentItem');

class ClipboardService {
  saveTextContent(content, type, deviceInfo) {
    try {
      return ContentItem.create({ content, type, deviceInfo });
    } catch (error) {
      throw new Error('Failed to save clipboard', { cause: error });
    }
  }

  getTextHistory() {
    try {
      return ContentItem.findAll();
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
