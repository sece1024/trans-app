import { useRef, useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

/**
 * Reusable upload zone component with drag-and-drop and pulse animation on success.
 *
 * @param {Object} props
 * @param {string} props.icon - emoji icon to display
 * @param {string} props.label - button label text (e.g. "选择文件")
 * @param {string} [props.accept] - file input accept attribute
 * @param {string} [props.hint] - text shown when a file is selected
 * @param {boolean} props.isLoading - whether an upload is in progress
 * @param {(file: File) => void} props.onFileChange - callback(file) when a file is selected
 * @param {() => void} props.onUpload - callback triggered on upload button click
 * @param {{ current: any }} [props.controlsRef] - ref to expose animation controls
 */
function UploadZone({ icon, label, accept, hint, isLoading, onFileChange, onUpload, controlsRef }) {
  const fileInputRef = useRef(null);
  const controls = useAnimation();
  const [isDragging, setIsDragging] = useState(false);

  // Expose controls to parent for pulse animation
  useEffect(() => {
    if (controlsRef) controlsRef.current = controls;
  }, [controlsRef, controls]);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file && onFileChange) onFileChange(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && onFileChange) onFileChange(file);
  };

  return (
    <motion.div
      className={`glass-card upload-zone${isDragging ? ' upload-zone--dragging' : ''}`}
      animate={controls}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="upload-icon">{icon}</div>
      <label className="file-input-button">
        {label}
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </label>
      {hint && <span className="upload-hint">{hint}</span>}
      <button onClick={onUpload} disabled={isLoading}>
        {isLoading ? <><span className="spinner" /> 上传中</> : '上传'}
      </button>
    </motion.div>
  );
}

export default UploadZone;
