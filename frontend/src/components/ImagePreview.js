import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function ImagePreview({ images, currentIndex, onClose, onNavigate }) {
  const image = images[currentIndex];

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, images.length, onNavigate]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, handlePrev, handleNext]);

  if (!image) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="image-preview-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="image-preview-container"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="image-preview-close" onClick={onClose} aria-label="关闭预览">✕</button>

          {currentIndex > 0 && (
            <button className="image-preview-nav image-preview-nav--prev" onClick={handlePrev} aria-label="上一张">
              ‹
            </button>
          )}

          <img
            src={`/api/images/${image.filename}`}
            alt={image.originalName}
            className="image-preview-img"
          />

          {currentIndex < images.length - 1 && (
            <button className="image-preview-nav image-preview-nav--next" onClick={handleNext} aria-label="下一张">
              ›
            </button>
          )}

          <div className="image-preview-footer">
            <span className="image-preview-name">{image.originalName}</span>
            <span className="image-preview-counter">{currentIndex + 1} / {images.length}</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ImagePreview;
