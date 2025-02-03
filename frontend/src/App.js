import { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [previewContent, setPreviewContent] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  const [clips, setClips] = useState([]);
  const [clipText, setClipText] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');

  // 获取文件列表
  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('获取文件列表失败:', error);
      setMessage('获取文件列表失败');
    }
  };

  // 获取剪贴板内容
  const fetchClips = async () => {
    try {
      const response = await fetch('/api/clipboard');
      const data = await response.json();
      setClips(data);
    } catch (error) {
      console.error('获取剪贴板内容失败:', error);
    }
  };

  // 获取设备信息
  useEffect(() => {
    const getDeviceInfo = () => {
      const ua = navigator.userAgent;
      let deviceName = 'Unknown Device';

      // 检测设备类型
      if (/iPhone/.test(ua)) {
        deviceName = 'iPhone';
      } else if (/iPad/.test(ua)) {
        deviceName = 'iPad';
      } else if (/Android/.test(ua)) {
        deviceName = 'Android';
      } else if (/Windows/.test(ua)) {
        deviceName = 'Windows';
      } else if (/Mac/.test(ua)) {
        deviceName = 'Mac';
      } else if (/Linux/.test(ua)) {
        deviceName = 'Linux';
      }

      // 检测浏览器
      let browserInfo = '';
      if (/Chrome/.test(ua)) {
        browserInfo = 'Chrome';
      } else if (/Firefox/.test(ua)) {
        browserInfo = 'Firefox';
      } else if (/Safari/.test(ua)) {
        browserInfo = 'Safari';
      } else if (/Edge/.test(ua)) {
        browserInfo = 'Edge';
      }

      setDeviceInfo(`${deviceName} - ${browserInfo}`);
    };

    getDeviceInfo();
  }, []);

  // 组件加载时获取文件列表和剪贴板内容
  useEffect(() => {
    fetchFiles();
    fetchClips();
    // 每5秒刷新一次
    const interval = setInterval(fetchClips, 5000);
    return () => clearInterval(interval);
  }, []);

  // 上传文件
  const handleUpload = async () => {
    const file = document.getElementById('fileInput').files[0];

    if (!file) {
      setMessage('请选择文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setMessage(data.message);
      // 上传成功后刷新文件列表
      fetchFiles();
    } catch (error) {
      setMessage('上传失败: ' + error.message);
    }
  };

  // 下载文件
  const handleDownload = (fileName) => {
    window.open(`/uploads/${fileName}`, '_blank');
  };

  // 删除文件（如果你想添加删除功能）
  const handleDelete = async (fileId) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      setMessage(data.message);
      fetchFiles();
    } catch (error) {
      setMessage('删除失败: ' + error.message);
    }
  };

  // 添加预览功能
  const handlePreview = async (fileName) => {
    try {
      const response = await fetch(`/api/files/${fileName}/preview`);
      const data = await response.json();
      if (data.content) {
        setPreviewFileName(fileName);
        setPreviewContent(data.content);
      } else {
        setMessage('无法预览此文件');
      }
    } catch (error) {
      setMessage('预览失败: ' + error.message);
    }
  };

  // 关闭预览
  const closePreview = () => {
    setPreviewContent('');
    setPreviewFileName('');
  };

  // 添加到剪贴板
  const handleAddClip = async () => {
    if (!clipText.trim()) return;

    try {
      const response = await fetch('/api/clipboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: clipText,
          deviceInfo: deviceInfo  // 添加设备信息
        })
      });
      const data = await response.json();
      setClips(data);
      setClipText('');
    } catch (error) {
      console.error('添加到剪贴板失败:', error);
    }
  };

  // 复制到剪贴板（兼容移动端）
  const handleCopy = async (text) => {
    try {
      // 优先使用现代 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setMessage('已复制到剪贴板');
        return;
      }

      // 回退方案：创建临时文本区域
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // 防止滚动到底部
      textArea.style.position = 'fixed';
      textArea.style.left = '0';
      textArea.style.top = '0';
      textArea.style.opacity = '0';
      
      document.body.appendChild(textArea);
      
      // 适配手机
      if (navigator.userAgent.match(/ipad|iphone/i)) {
        // iOS 特殊处理
        textArea.contentEditable = true;
        textArea.readOnly = false;
        
        const range = document.createRange();
        range.selectNodeContents(textArea);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        textArea.setSelectionRange(0, 999999);
      } else {
        // 其他设备
        textArea.select();
      }
      
      try {
        document.execCommand('copy');
        setMessage('已复制到剪贴板');
      } catch (err) {
        setMessage('复制失败，请手动复制');
      }
      
      document.body.removeChild(textArea);
    } catch (error) {
      console.error('复制失败:', error);
      setMessage('复制失败，请手动复制');
    }
  };

  return (
    <div className="App">
      <h1>文件上传系统</h1>
      
      {/* 上传部分 */}
      <div className="upload-section">
        <input type="file" id="fileInput" />
        <button onClick={handleUpload}>上传</button>
      </div>

      {/* 消息显示 */}
      {message && (
        <div className="message">
          {message}
        </div>
      )}

      {/* 文件列表 */}
      <div className="files-section">
        <h2>已上传文件</h2>
        {files.length === 0 ? (
          <p>暂无文件</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>文件名</th>
                <th>大小</th>
                <th>上传时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.originalName}>
                  <td>{file.originalName}</td>
                  <td>{(file.size / 1024).toFixed(2)} KB</td>
                  <td>{new Date(file.uploadTime).toLocaleString()}</td>
                  <td>
                    <button onClick={() => handleDownload(file.originalName)}>
                      下载
                    </button>
                    {file.originalName.endsWith('.txt') && (
                      <button onClick={() => handlePreview(file.originalName)}>
                        预览
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(file.originalName)}
                      className="delete-btn"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 预览模态框 */}
      {previewContent && (
        <div className="preview-modal">
          <div className="preview-content">
            <div className="preview-header">
              <h3>{previewFileName}</h3>
              <button onClick={closePreview}>关闭</button>
            </div>
            <pre className="preview-text">{previewContent}</pre>
          </div>
        </div>
      )}

      {/* 共享剪贴板部分 */}
      <div className="clipboard-section">
        <h2>共享剪贴板</h2>
        <div className="clipboard-input">
          <textarea
            value={clipText}
            onChange={(e) => setClipText(e.target.value)}
            placeholder="输入要分享的文本"
          />
          <button onClick={handleAddClip}>分享</button>
        </div>
        <div className="clipboard-list">
          {clips.map((clip, index) => (
            <div key={index} className="clipboard-item">
              <pre onClick={() => handleCopy(clip.text)} className="clipboard-text">
                {clip.text}
              </pre>
              <div className="clipboard-info">
                <div className="info-left">
                  <span className="device-info">{clip.deviceInfo}</span>
                  <span className="time-info">{new Date(clip.createTime).toLocaleString()}</span>
                </div>
                <button onClick={() => handleCopy(clip.text)}>复制</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
