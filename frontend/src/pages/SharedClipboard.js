import { useState, useEffect } from 'react';

function SharedClipboard() {
  const [clips, setClips] = useState([]);
  const [clipText, setClipText] = useState('');
  const [message, setMessage] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');

  useEffect(() => {
    const getDeviceInfo = () => {
      const ua = navigator.userAgent.toLowerCase();
      let deviceName = '';
      let browserInfo = '';

      // 检测设备类型
      if (ua.includes('iphone')) {
        deviceName = 'iPhone';
      } else if (ua.includes('ipad')) {
        deviceName = 'iPad';
      } else if (ua.includes('android')) {
        // 区分手机和平板
        if (ua.includes('mobile')) {
          deviceName = 'Android Phone';
        } else {
          deviceName = 'Android Tablet';
        }
      } else if (ua.includes('windows')) {
        deviceName = 'Windows PC';
      } else if (ua.includes('macintosh') || ua.includes('mac os')) {
        deviceName = 'Mac';
      } else if (ua.includes('linux')) {
        deviceName = 'Linux';
      } else {
        deviceName = 'Unknown Device';
      }

      // 检测浏览器
      if (ua.includes('chrome')) {
        browserInfo = 'Chrome';
      } else if (ua.includes('firefox')) {
        browserInfo = 'Firefox';
      } else if (ua.includes('safari') && !ua.includes('chrome')) {
        // Chrome 的 UA 字符串也包含 'safari'，所以需要特别处理
        browserInfo = 'Safari';
      } else if (ua.includes('edge')) {
        browserInfo = 'Edge';
      } else if (ua.includes('opera') || ua.includes('opr')) {
        browserInfo = 'Opera';
      } else {
        browserInfo = 'Unknown Browser';
      }

      console.log('User Agent:', ua);  // 用于调试
      setDeviceInfo(`${deviceName} - ${browserInfo}`);
    };

    getDeviceInfo();
    fetchClips();
    // const interval = setInterval(fetchClips, 5000);
    // return () => clearInterval(interval);
  }, []);

  const fetchClips = async () => {
    try {
      const response = await fetch('/api/clipboard');
      const data = await response.json();
      setClips(data);
    } catch (error) {
      console.error('获取剪贴板内容失败:', error);
    }
  };

  const handleAddClip = async () => {
    if (!clipText.trim()) {
      setMessage('请输入要分享的文本');
      return;
    }

    try {
      const response = await fetch('/api/clipboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: clipText,
          deviceInfo 
        })
      });
      const data = await response.json();
      setClips(data);
      setClipText('');
      setMessage('文本已分享');
    } catch (error) {
      setMessage('分享失败: ' + error.message);
    }
  };

  // 添加复制功能
  const handleCopy = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        // 优先使用 Clipboard API
        await navigator.clipboard.writeText(text);
        setMessage('已复制到剪贴板');
      } else {
        // 回退方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          textArea.remove();
          setMessage('已复制到剪贴板');
        } catch (err) {
          console.error('复制失败:', err);
          setMessage('复制失败，请手动复制');
        }
      }
    } catch (error) {
      console.error('复制失败:', error);
      setMessage('复制失败，请手动复制');
    }

    // 3秒后清除消息
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="page-container">
      <h1>共享剪贴板</h1>
      <div className="clipboard-section">
        <div className="clipboard-input">
          <textarea
            value={clipText}
            onChange={(e) => setClipText(e.target.value)}
            placeholder="输入要分享的文本..."
          />
          <button onClick={handleAddClip}>分享文本</button>
        </div>
        {message && <div className="message">{message}</div>}
        <div className="clipboard-list">
          {clips.map((clip, index) => (
            <div key={index} className="clipboard-item">
              <pre 
                className="clipboard-text"
                onClick={() => handleCopy(clip.text)}
                style={{ cursor: 'pointer' }}
                title="点击复制"
              >
                {clip.text}
              </pre>
              <div className="clipboard-info">
                <div className="info-left">
                  <span className="device-info">{clip.deviceInfo}</span>
                  <span className="time-info">
                    {new Date(clip.createTime).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SharedClipboard; 