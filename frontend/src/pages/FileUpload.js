import { useState } from 'react';

function FileUpload() {
  const [message, setMessage] = useState('');
  const [fileName, setFileName] = useState('');

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
    } catch (error) {
      setMessage('上传失败: ' + error.message);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
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
    </div>
  );
}

export default FileUpload; 