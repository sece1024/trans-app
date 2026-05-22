const ContentItem = require('../db/ContentItem');

class ClipboardService {
  async saveTextContent(content, type, deviceInfo) {
    try {
      return ContentItem.create({ content, type, deviceInfo });
    } catch (error) {
      throw new Error('Failed to save clipBoard');
    }
  }

  async getTextHistory() {
    try {
      return ContentItem.findAll();
    } catch (error) {
      throw new Error('Failed to get clipBoard history!');
    }
  }

  async delete(contentId) {
    try {
      return ContentItem.destroy(contentId);
    } catch (error) {
      throw new Error('failed to delete: ' + contentId);
    }
  }
}

module.exports = new ClipboardService();
