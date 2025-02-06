import React, { useState, useEffect } from 'react';

function ImageUpload() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [message, setMessage] = useState('');
  const [images, setImages] = useState([]);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch('/api/images');
      if (!response.ok) {
        throw new Error('获取图片列表失败');
      }
      const data = await response.json();
      setImages(data);
    } catch (error) {
      setMessage('获取图片列表失败: ' + error.message);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    } else {
      setMessage('请选择有效的图片文件');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      setMessage('请先选择图片');
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const data = await response.json();
      setMessage('图片上传成功');
      setSelectedImage(null);
      fetchImages(); // 刷新图片列表
    } catch (error) {
      setMessage('上传失败: ' + error.message);
    }
  };

  const handleImageDownload = async (filename, originalName) => {
    try {
      const response = await fetch(`/api/images/download/${filename}`);
      if (!response.ok) {
        throw new Error('下载失败');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName; // 使用原始文件名
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setMessage('下载失败: ' + error.message);
    }
  };

  return (
    <div className="image-upload-container">
      <h2>图片上传</h2>
      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
        <button onClick={handleUpload}>上传图片</button>
      </div>
      {message && <p className="message">{message}</p>}
      
      <div className="image-gallery">
        {images.map((image, index) => (
          <div key={index} className="image-item">
            <img 
              src={`/api/images/${image.filename}`} 
              alt={image.originalName}
              loading="lazy"
            />
            <p>{image.originalName}</p>
            <button 
              className="download-btn"
              onClick={() => handleImageDownload(image.filename, image.originalName)}
            >
              下载图片
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ImageUpload; 