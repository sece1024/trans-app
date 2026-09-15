import { useState, useCallback, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { downloadFile, copyLink, pulseSuccess } from '../utils/uploadHelpers';
import { MAX_IMAGE_SIZE } from '../utils/uploadLimits';
import useResourceList from '../hooks/useResourceList';
import ResourceGrid from '../components/ResourceGrid';
import UploadZone from '../components/UploadZone';
import ImagePreview from '../components/ImagePreview';

function ImageUpload() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [previewIndex, setPreviewIndex]   = useState(null);
  const uploadControlsRef = useRef(null);
  const toast = useToast();

  const getImagesPage = useCallback(
    (limit, cursor) => api.getImages(limit, cursor),
    []
  );
  const removeImage = useCallback((item) => api.deleteImage(item.filename), []);

  const {
    items: imageList,
    hasMore,
    loadingMore,
    loadMore,
    reload: getImageList,
    deletingId,
    handleDelete,
  } = useResourceList({
    fetchPage: getImagesPage,
    remove: removeImage,
    messages: {
      loadFailed: '获取图片失败',
      removeFailed: '删除失败',
      removed: '已删除',
    },
  });

  const handleImageChange = (file) => {
    if (file?.type.startsWith('image/')) setSelectedImage(file);
    else toast('请选择有效的图片文件', 'error');
  };

  const handleUpload = async () => {
    if (!selectedImage) { toast('请先选择图片', 'error'); return; }
    if (selectedImage.size > MAX_IMAGE_SIZE) { toast('图片过大，最大支持 5MB', 'error'); return; }
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

      {imageList.length > 0 && (
        <p className="section-header">图片库 · {imageList.length} 张</p>
      )}

      <ResourceGrid
        items={imageList}
        getItemKey={(image) => image.filename}
        itemClassName="image-card"
        itemMotionProps={(image, index) => ({
          role: 'button',
          tabIndex: 0,
          'aria-label': `预览图片：${image.originalName}`,
          onClick: () => setPreviewIndex(index),
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setPreviewIndex(index);
            }
          },
        })}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        emptyIcon="🖼️"
        emptyTitle="暂无图片"
        emptyDescription="点击上方区域上传图片"
        renderItem={(image) => (
          <>
            <img src={`/api/images/${image.filename}`} alt={image.originalName} loading="lazy" />
            <div className="image-overlay">
              <p className="image-name-overlay">{image.originalName}</p>
              <div className="card-actions">
                <button className="btn--icon" onClick={(e) => { e.stopPropagation(); handleCopyLink(image.filename); }}>🔗 链接</button>
                <button className="btn--icon" onClick={(e) => { e.stopPropagation(); handleDownload(image.filename, image.originalName); }}>↓ 下载</button>
                <button className="btn--icon btn--danger" onClick={(e) => { e.stopPropagation(); handleDelete(image); }}>删除</button>
              </div>
            </div>
            {deletingId === image.filename && (
              <div className="card-loading"><span className="spinner" /></div>
            )}
          </>
        )}
      />

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