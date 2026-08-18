import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { containerVariants, cardVariants } from '../utils/animations';
import { downloadFile, copyLink, pulseSuccess } from '../utils/uploadHelpers';
import usePaginatedList from '../hooks/usePaginatedList';
import UploadZone from '../components/UploadZone';
import EmptyState from '../components/EmptyState';
import ImagePreview from '../components/ImagePreview';

const PAGE_SIZE = 50;

function ImageUpload() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [deletingName, setDeletingName]   = useState(null);
  const [previewIndex, setPreviewIndex]   = useState(null);
  const uploadControlsRef = useRef(null);
  const toast = useToast();

  const getImagesPage = useCallback(
    (limit, cursor) => api.getImages(limit, cursor),
    []
  );
  const handleListError = useCallback(() => toast('获取图片失败', 'error'), [toast]);
  const {
    items: imageList,
    hasMore,
    loadingMore,
    loadMore,
    reload: getImageList,
  } = usePaginatedList(getImagesPage, { pageSize: PAGE_SIZE, onError: handleListError });

  const handleImageChange = (file) => {
    if (file?.type.startsWith('image/')) setSelectedImage(file);
    else toast('请选择有效的图片文件', 'error');
  };

  const handleUpload = async () => {
    if (!selectedImage) { toast('请先选择图片', 'error'); return; }
    const formData = new FormData();
    formData.append('image', selectedImage);
    setIsLoading(true);
    try {
      await api.uploadImage(formData);
      setSelectedImage(null);
      await getImageList();
      await pulseSuccess(uploadControlsRef);
      toast('图片上传成功', 'success');
    } catch { toast('上传失败', 'error'); }
    finally   { setIsLoading(false); }
  };

  const handleDownload = async (filename, originalName) => {
    try {
      await downloadFile(`/api/images/download/${filename}`, originalName);
    } catch { toast('下载失败', 'error'); }
  };

  const handleCopyLink = async (filename) => {
    await copyLink(`/api/images/${filename}`, toast);
  };

  const handleDelete = useCallback(async (filename) => {
    setDeletingName(filename);
    try {
      await api.deleteImage(filename);
      await getImageList();
      toast('已删除', 'info');
    } catch { toast('删除失败', 'error'); }
    finally   { setDeletingName(null); }
  }, [getImageList, toast]);

  return (
    <div className="page">
      <h1 className="page-title">图片</h1>

      <UploadZone
        icon="🖼️"
        label="选择图片"
        accept="image/*"
        hint={selectedImage ? `已选择：${selectedImage.name}` : ''}
        isLoading={isLoading}
        onFileChange={handleImageChange}
        onUpload={handleUpload}
        controlsRef={uploadControlsRef}
      />

      {imageList.length > 0 ? (
        <>
          <p className="section-header">图片库 · {imageList.length} 张</p>
          <motion.div className="bento-grid" variants={containerVariants} initial="hidden" animate="visible">
            {imageList.map((image, index) => (
              <motion.div
                key={image.filename}
                className="glass-card image-card"
                variants={cardVariants}
                role="button"
                tabIndex={0}
                aria-label={`预览图片：${image.originalName}`}
                onClick={() => setPreviewIndex(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPreviewIndex(index);
                  }
                }}
              >
                <img src={`/api/images/${image.filename}`} alt={image.originalName} loading="lazy" />
                <div className="image-overlay">
                  <p className="image-name-overlay">{image.originalName}</p>
                  <div className="card-actions">
                    <button className="btn--icon" onClick={(e) => { e.stopPropagation(); handleCopyLink(image.filename); }}>🔗 链接</button>
                    <button className="btn--icon" onClick={(e) => { e.stopPropagation(); handleDownload(image.filename, image.originalName); }}>↓ 下载</button>
                    <button className="btn--icon btn--danger" onClick={(e) => { e.stopPropagation(); handleDelete(image.filename); }}>删除</button>
                  </div>
                </div>
                {deletingName === image.filename && (
                  <div className="card-loading"><span className="spinner" /></div>
                )}
              </motion.div>
            ))}
          </motion.div>
          {hasMore && (
            <div className="load-more">
              <button className="btn--text" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? '加载中…' : '加载更多'}
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon="🖼️"
          title="暂无图片"
          description="点击上方区域上传图片"
        />
      )}

      {previewIndex !== null && (
        <ImagePreview
          images={imageList}
          currentIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onNavigate={setPreviewIndex}
        />
      )}
    </div>
  );
}

export default ImageUpload;
