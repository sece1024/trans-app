class ClipboardService {
  constructor() {
    this.clips = [];
    this.maxClips = 100;
  }

  // 添加新的剪贴内容
  addClip(text, clientId, deviceInfo) {
    const clipInfo = {
      text,
      clientId,
      deviceInfo,
      createTime: new Date()
    };
    
    // 添加到数组开头
    this.clips.unshift(clipInfo);
    
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