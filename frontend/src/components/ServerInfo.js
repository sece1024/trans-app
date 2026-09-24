import { useState, useEffect } from 'react';
import { copyToClipboard } from '../utils/copyToClipboard';
import { api } from '../api/client';

// 模块级缓存：侧栏与移动端各挂一个实例（同一时刻只有一个可见），
// 共享同一次请求，避免每次加载重复调用 /api/server-info。
let serverInfoPromise = null;

function fetchServerInfoOnce() {
  if (!serverInfoPromise) {
    serverInfoPromise = api.getServerInfo().catch((error) => {
      serverInfoPromise = null; // 失败后清除缓存，允许下次重试
      throw error;
    });
  }
  return serverInfoPromise;
}

function ServerInfo() {
  const [serverInfo, setServerInfo] = useState(null);
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    fetchServerInfoOnce()
      .then(setServerInfo)
      .catch((error) => {
        console.error('获取服务器信息失败:', error);
      });
  }, []);

  const handleCopy = async (text) => {
    try {
      await copyToClipboard(text);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  if (!serverInfo) return null;

  return (
    <div className="server-info">
      <div className="server-info-content">
        {serverInfo.ips.map((ip, index) => (
          <button
            key={index}
            className="ip-item"
            onClick={() => handleCopy(`http://${ip.address}:${serverInfo.port}`)}
            aria-label={`复制地址 ${ip.address}:${serverInfo.port}`}
          >
            <span className="ip-label">局域网地址 {index + 1}</span>
            <span className="ip-address">
              {ip.address}:{serverInfo.port}
            </span>
            <span className="copy-hint">点击复制</span>
          </button>
        ))}
      </div>
      {showCopied && <div className="copy-message">已复制</div>}
    </div>
  );
}

export default ServerInfo; 