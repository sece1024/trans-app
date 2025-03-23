import { useState, useEffect } from 'react';

function FileUpload() {
  const [message, setMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // 添加 isLoading 状态
  const basePath = '/api/files'

  const handleUpload = async () => {
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
      setMessage('请选择文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsLoading(true); // 开始上传时设置为 true

    try {
      const response = await fetch(`${basePath}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      console.log('handleUpload: ', data);
      setMessage(data.message);
      fetchUploadedFiles();
    } catch (error) {
      setMessage('上传失败: ' + error.message);
    } finally {
      setIsLoading(false); // 上传完成后设置为 false
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch(`${basePath}`);
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
      const response = await fetch(`${basePath}/${fileName}`);
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

  const handleDelete = async (fileName) => {
    try {
      await fetch(`${basePath}/${fileName}`, {
        method: 'DELETE'
      });

      fetchUploadedFiles();
    }catch (error) {
      console.error(error);
    }
  }

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
        <button onClick={handleUpload} disabled={isLoading}>
          {isLoading ? '上传中...' : '上传文件'}
        </button>
        {isLoading && <div className="loading-spinner">Loading...</div>} {/* 添加 loading 样式 */}
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
                  onClick={() => handleDownload(file.name)}
                  style={{ cursor: 'pointer' }}
                >
                  {file.name}
                </span>
                <span className="file-operation">
                  {file.sizeInMB} MB
                  <button
                      className="file-delete-button"
                      onClick={() => handleDelete(file.name)}>delete</button>
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