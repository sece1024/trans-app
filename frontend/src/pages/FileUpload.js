import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useToast } from '../context/ToastContext';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden:   { opacity: 0, scale: 0.88, y: 12 },
  visible:  { opacity: 1, scale: 1,    y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 22 } },
};

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  return ({
    pdf:'📄', doc:'📝', docx:'📝', xls:'📊', xlsx:'📊',
    ppt:'📋', pptx:'📋', zip:'🗜', rar:'🗜', '7z':'🗜',
    mp4:'🎬', mov:'🎬', avi:'🎬', mp3:'🎵', wav:'🎵',
    jpg:'🖼', jpeg:'🖼', png:'🖼', gif:'🖼', svg:'🖼', webp:'🖼',
    js:'📜', ts:'📜', py:'🐍', html:'🌐', css:'🎨', json:'⚙️', txt:'📃',
  })[ext] || '📁';
}

function FileUpload() {
  const [fileName, setFileName]         = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [deletingName, setDeletingName] = useState(null);
  const fileInputRef      = useRef(null);
  const uploadZoneControls = useAnimation();
  const toast = useToast();
  const basePath = '/api/files';

  useEffect(() => { fetchUploadedFiles(); }, []);

  const fetchUploadedFiles = async () => {
    try {
      const res = await fetch(basePath);
      setUploadedFiles(await res.json());
    } catch { toast('获取文件列表失败', 'error'); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setFileName(file.name);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files[0];
    if (!file) { toast('请选择文件', 'error'); return; }
    const formData = new FormData();
    formData.append('file', file);
    setIsLoading(true);
    try {
      const res  = await fetch(`${basePath}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      await fetchUploadedFiles();
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Success pulse on upload zone
      await uploadZoneControls.start({
        scale: [1, 1.018, 1],
        transition: { duration: 0.45, ease: 'easeOut' },
      });
      toast(data.message || '上传成功', 'success');
    } catch { toast('上传失败', 'error'); }
    finally   { setIsLoading(false); }
  };

  const handleDownload = async (name) => {
    try {
      const res  = await fetch(`${basePath}/${name}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: name });
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); a.remove();
    } catch { toast('下载失败', 'error'); }
  };

  const handleCopyLink = async (name) => {
    const url = `${window.location.origin}/api/files/${encodeURIComponent(name)}`;
    await navigator.clipboard.writeText(url);
    toast('链接已复制', 'success');
  };

  const handleDelete = async (name) => {
    setDeletingName(name);
    try {
      await fetch(`${basePath}/${name}`, { method: 'DELETE' });
      await fetchUploadedFiles();
      toast('已删除', 'info');
    } catch { toast('删除失败', 'error'); }
    finally   { setDeletingName(null); }
  };

  return (
    <div className="page">
      <h1 className="page-title">文件</h1>

      {/* Upload zone */}
      <motion.div className="glass-card upload-zone" animate={uploadZoneControls}>
        <div className="upload-icon">📂</div>
        <label className="file-input-button">
          选择文件
          <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
        </label>
        {fileName && <span className="upload-hint">已选择：{fileName}</span>}
        <button onClick={handleUpload} disabled={isLoading}>
          {isLoading ? <><span className="spinner" /> 上传中</> : '上传'}
        </button>
      </motion.div>

      {/* Bento grid */}
      {uploadedFiles.length > 0 && (
        <>
          <p className="section-header">已上传 · {uploadedFiles.length} 个文件</p>
          <motion.div className="bento-grid" variants={containerVariants} initial="hidden" animate="visible">
            {uploadedFiles.map((file) => (
              <motion.div key={file.name} className="glass-card file-card" variants={cardVariants}>
                <div className="file-card-body">
                  <span className="file-icon">{fileIcon(file.name)}</span>
                  <div>
                    <p className="file-name">{file.name}</p>
                    <p className="file-meta">{file.sizeInMB} MB</p>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn--icon" onClick={() => handleCopyLink(file.name)}>🔗 复制链接</button>
                  <button className="btn--icon" onClick={() => handleDownload(file.name)}>↓ 下载</button>
                  <button className="btn--icon btn--danger" onClick={() => handleDelete(file.name)}>删除</button>
                </div>
                {deletingName === file.name && (
                  <div className="card-loading"><span className="spinner" /></div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}

export default FileUpload;
