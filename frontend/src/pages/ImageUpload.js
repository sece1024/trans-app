import React, {useState, useEffect, useCallback} from 'react';

function ImageUpload() {
    const [selectedImage, setSelectedImage] = useState(null);
    const [message, setMessage] = useState('');
    const [imageList, setImageList] = useState([]);

    useEffect(() => {
        getImageList();
    }, []);

    const getImageList = useCallback(async () => {
        try {
            const response = await fetch('/api/images');

            const data = await response.json();
            setImageList(data);
        } catch (error) {
            setMessage('获取图片列表失败: ' + error.message);
        }
    }, []);

    const handleDeleteImage = useCallback(async (filename) => {
        try {
            await fetch(`/api/images/${filename}`, {
                method: 'DELETE'
            });
            getImageList();
        }catch (error) {
            console.error(error);
        }
    }, []);

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
            const response = await fetch('/api/images/upload', {
                method: 'POST',
                body: formData,
            });

            await response.json();
            setMessage('图片上传成功');
            setSelectedImage(null);
            await getImageList();
        } catch (error) {
            setMessage('上传失败: ' + error.message);
        }
    };

    const handleImageDownload = async (filename, originalName) => {
        try {
            const response = await fetch(`/api/images/download/${filename}`);

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
                <label className="file-input-button">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{display: 'none'}}
                    />
                    选择图片
                </label>
                {selectedImage && (
                    <span className="selected-file-name">
            已选择: {selectedImage.name}
          </span>
                )}
                <button onClick={handleUpload}>上传</button>
            </div>
            {message && <p className="message">{message}</p>}

            <div className="image-gallery">
                {imageList.map((image, index) => (
                    <div key={index} className="image-card">
                        <div className="image-wrapper">
                            <img
                                src={`/api/images/${image.filename}`}
                                alt={image.originalName}
                                loading="lazy"
                                onClick={() => handleImageDownload(image.filename, image.originalName)}
                                style={{
                                    cursor: 'pointer',
                                    transition: 'transform 0.3s ease',
                                    '&:hover': {
                                        transform: 'scale(1.05)'
                                    }
                                }}
                            />
                        </div>
                        <div className="image-info">
                            <span className="image-name">{image.originalName}</span>
                            <button className="file-delete-button" onClick={() => handleDeleteImage(image.originalName)}>delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ImageUpload; 