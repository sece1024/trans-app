import { useState, useEffect } from 'react';

function ServerInfo() {
  const [serverInfo, setServerInfo] = useState(null);
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    fetchServerInfo();
  }, []);

  const fetchServerInfo = async () => {
    try {
      const response = await fetch('/api/server-info');
      const data = await response.json();
      setServerInfo(data);
    } catch (error) {
      console.error('获取服务器信息失败:', error);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
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
          <div
            key={index}
            className="ip-item"
            onClick={() => handleCopy(`http://${ip.address}:${serverInfo.port}`)}
          >
            <span className="ip-label">局域网地址 {index + 1}</span>
            <span className="ip-address">
              {ip.address}:{serverInfo.port}
            </span>
            <span className="copy-hint">点击复制</span>
          </div>
        ))}
      </div>
      {showCopied && <div className="copy-message">已复制</div>}
    </div>
  );
}

export default ServerInfo; 