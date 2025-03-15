const Content = require("../db/Content");
const logger = require('../config/logger')

class ClipboardService {
  async saveTextContent(content, type, deviceInfo) {
    try {
      const contentItem = await Content.create({
        content,
        type,
        deviceInfo
      });

      return contentItem;
    } catch (error) {
      throw new Error('Failed to save clipBoard');
    }
  }

  async getTextHistory() {
    try {
      const history = await Content.findAll();
      return history;
    } catch (error) {
      throw new Error('Failed to get clipBoard history!')
    }
  }

  async delete(contentId) {
    try {
      return await Content.destroy({ where: { id: contentId } });
    } catch (error) {
      throw new Error('failed to delete: ' + contentId);
    }
  }
}

module.exports = new ClipboardService(); 