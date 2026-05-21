import { useState, useEffect, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { copyToClipboard } from '../utils/copyToClipboard';
import EmptyState from '../components/EmptyState';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden:  { opacity: 0, scale: 0.88, y: 12 },
  visible: { opacity: 1, scale: 1,    y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 22 } },
};

function ImageUpload() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageList, setImageList]         = useState([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [deletingName, setDeletingName]   = useState(null);
  const uploadZoneControls = useAnimation();
  const toast = useToast();

  useEffect(() => { getImageList(); }, []);

  const getImageList = useCallback(async () => {
    try { setImageList(await (await fetch('/api/images')).json()); }
    catch { toast('获取图片失败', 'error'); }
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file?.type.startsWith('image/')) setSelectedImage(file);
    else toast('请选择有效的图片文件', 'error');
  };

  const handleUpload = async () => {
    if (!selectedImage) { toast('请先选择图片', 'error'); return; }
    const formData = new FormData();
    formData.append('image', selectedImage);
    setIsLoading(true);
    try {
      await fetch('/api/images/upload', { method: 'POST', body: formData });
      setSelectedImage(null);
      await getImageList();
      await uploadZoneControls.start({
        scale: [1, 1.018, 1],
        transition: { duration: 0.45, ease: 'easeOut' },
      });
      toast('图片上传成功', 'success');
    } catch { toast('上传失败', 'error'); }
    finally   { setIsLoading(false); }
  };

  const handleDownload = async (filename, originalName) => {
    try {
      const res  = await fetch(`/api/images/download/${filename}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: originalName });
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); a.remove();
    } catch { toast('下载失败', 'error'); }
  };

  const handleCopyLink = async (filename) => {
    const url = `${window.location.origin}/api/images/${filename}`;
    try {
      await copyToClipboard(url);
      toast('链接已复制', 'success');
    } catch { toast('复制失败', 'error'); }
  };

  const handleDelete = useCallback(async (filename) => {
    setDeletingName(filename);
    try {
      await fetch(`/api/images/${filename}`, { method: 'DELETE' });
      await getImageList();
      toast('已删除', 'info');
    } catch { toast('删除失败', 'error'); }
    finally   { setDeletingName(null); }
  }, [getImageList]);

  return (
    <div className="page">
      <h1 className="page-title">图片</h1>

      {/* Upload zone */}
      <motion.div className="glass-card upload-zone" animate={uploadZoneControls}>
        <div className="upload-icon">🖼️</div>
        <label className="file-input-button">
          <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          选择图片
        </label>
        {selectedImage && <span className="upload-hint">已选择：{selectedImage.name}</span>}
        <button onClick={handleUpload} disabled={isLoading}>
          {isLoading ? <><span className="spinner" /> 上传中</> : '上传'}
        </button>
      </motion.div>

      {/* Bento grid */}
      {imageList.length > 0 ? (
        <>
          <p className="section-header">图片库 · {imageList.length} 张</p>
          <motion.div className="bento-grid" variants={containerVariants} initial="hidden" animate="visible">
            {imageList.map((image) => (
              <motion.div
                key={image.filename}
                className="glass-card image-card"
                variants={cardVariants}
              >
                <img src={`/api/images/${image.filename}`} alt={image.originalName} loading="lazy" />
                <div className="image-overlay">
                  <p className="image-name-overlay">{image.originalName}</p>
                  <div className="card-actions">
                    <button className="btn--icon" onClick={() => handleCopyLink(image.filename)}>🔗 链接</button>
                    <button className="btn--icon" onClick={() => handleDownload(image.filename, image.originalName)}>↓ 下载</button>
                    <button className="btn--icon btn--danger" onClick={() => handleDelete(image.filename)}>删除</button>
                  </div>
                </div>
                {deletingName === image.filename && (
                  <div className="card-loading"><span className="spinner" /></div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </>
      ) : (
        <EmptyState
          icon="🖼️"
          title="暂无图片"
          description="点击上方区域上传图片"
        />
      )}
    </div>
  );
}

export default ImageUpload;
