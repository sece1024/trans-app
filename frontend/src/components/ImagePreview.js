import { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function ImagePreview({ open, images, currentIndex, onClose, onNavigate }) {
  const image = images[currentIndex];
  const containerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, images.length, onNavigate]);

  // 打开时锁定页面滚动，关闭后把焦点还给打开预览的卡片
  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 等入场动画开始后再聚焦，避免浏览器滚动到尚未定位的元素
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  // 键盘操作：Esc 关闭、左右切换、Tab 在弹层内循环
  useEffect(() => {
    if (!open) return undefined;

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrev();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
        return;
      }
      if (event.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(container.querySelectorAll('button:not([disabled])'));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!container.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose, handlePrev, handleNext]);

  return (
    <AnimatePresence>
      {open && image && (
        <motion.div
          className="image-preview-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            ref={containerRef}
            className="image-preview-container"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={image.originalName}
          >
            <button
              ref={closeButtonRef}
              className="image-preview-close"
              onClick={onClose}
              aria-label="关闭预览"
            >
              ✕
            </button>

            {currentIndex > 0 && (
              <button
                className="image-preview-nav image-preview-nav--prev"
                onClick={handlePrev}
                aria-label="上一张"
              >
                ‹
              </button>
            )}

            <img
              src={`/api/images/${encodeURIComponent(image.filename)}`}
              alt={image.originalName}
              className="image-preview-img"
            />

            {currentIndex < images.length - 1 && (
              <button
                className="image-preview-nav image-preview-nav--next"
                onClick={handleNext}
                aria-label="下一张"
              >
                ›
              </button>
            )}

            <div className="image-preview-footer">
              <span className="image-preview-name">{image.originalName}</span>
              <span className="image-preview-counter">
                {currentIndex + 1} / {images.length}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ImagePreview;
