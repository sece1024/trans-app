class ClipboardService {
  constructor() {
    this.clips = [];  // 存储剪贴板内容
    this.maxClips = 10;  // 最多保存的条数
  }

  // 添加新的剪贴内容
  addClip(text, clientId) {
    const clipInfo = {
      text,
      clientId,
      createTime: new Date()
    };
    
    // 添加到数组开头
    this.clips.unshift(clipInfo);
    
    // 保持最大条数限制
    if (this.clips.length > this.maxClips) {
      this.clips.pop();  // 删除最老的内容
    }
    
    return this.clips;
  }

  // 获取所有剪贴内容
  getAllClips() {
    return this.clips;
  }
}

module.exports = new ClipboardService(); 