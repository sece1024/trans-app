import { useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

/**
 * Reusable upload zone component with pulse animation on success.
 *
 * Props:
 *   icon        – emoji icon to display
 *   label       – button label text (e.g. "选择文件")
 *   accept      – file input accept attribute (optional)
 *   hint        – text shown when a file is selected
 *   isLoading   – whether an upload is in progress
 *   onFileChange – callback(file) when file is selected
 *   onUpload    – callback triggered on upload button click
 */
function UploadZone({ icon, label, accept, hint, isLoading, onFileChange, onUpload, controlsRef }) {
  const fileInputRef = useRef(null);
  const controls = useAnimation();

  // Expose controls to parent for pulse animation
  if (controlsRef) controlsRef.current = controls;

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file && onFileChange) onFileChange(file);
  };

  return (
    <motion.div className="glass-card upload-zone" animate={controls}>
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
