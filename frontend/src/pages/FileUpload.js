import { useState, useEffect } from 'react';

function FileUpload() {
  const [message, setMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);

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
      console.log('handleUpload: ', data);
      setMessage(data.message);
      fetchUploadedFiles();
    } catch (error) {
      setMessage('上传失败: ' + error.message);
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      console.log('fetchUploadedFiles: ', data);
      setUploadedFiles(data);
    } catch (error) {
      setMessage('获取文件列表失败: ' + error.message);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleDownload = async (fileName) => {
    try {
      const response = await fetch(`/api/download/${fileName}`);
      if (!response.ok) {
        throw new Error('下载失败');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setMessage('下载失败: ' + error.message);
    }
  };

  return (
    <div className="page-container">
      <h1>文件上传</h1>
      <div className="upload-section">
        <div className="file-input-wrapper">
          <label className="file-input-button" htmlFor="fileInput">
            选择文件
          </label>
          <input 
            type="file" 
            id="fileInput" 
            onChange={handleFileChange}
          />
          {fileName && <div className="selected-file">已选择: {fileName}</div>}
        </div>
        <button onClick={handleUpload}>上传文件</button>
      </div>
      {message && (
        <div className="message">
          {message}
        </div>
      )}
      <div className="files-list">
        <h2>已上传文件</h2>
        {uploadedFiles.length > 0 ? (
          <ul>
            {uploadedFiles.map((file, index) => (
              <li key={index}>
                <span 
                  className="file-name" 
                  onClick={() => handleDownload(file.originalName)}
                  style={{ cursor: 'pointer' }}
                >
                  {file.originalName}
                </span>
                <span className="file-date">
                  {new Date(file.uploadTime).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无上传文件</p>
        )}
      </div>
    </div>
  );
}

export default FileUpload; 