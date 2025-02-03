import { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [previewContent, setPreviewContent] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');

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

  // 组件加载时获取文件列表
  useEffect(() => {
    fetchFiles();
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
    </div>
  );
}

export default App;
