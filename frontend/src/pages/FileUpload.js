import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { containerVariants, cardVariants } from '../utils/animations';
import { downloadFile, copyLink, pulseSuccess, formatFileSize, checkFileSize } from '../utils/uploadHelpers';
import UploadZone from '../components/UploadZone';
import EmptyState from '../components/EmptyState';

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
  const uploadControlsRef = useRef(null);
  const toast = useToast();

  const fetchUploadedFiles = useCallback(async () => {
    try {
      setUploadedFiles(await api.getFiles());
    } catch { toast('获取文件列表失败', 'error'); }
  }, [toast]);

  useEffect(() => { fetchUploadedFiles(); }, [fetchUploadedFiles]);

  const handleFileChange = (file) => {
    setFileName(file.name);
    fileInputRef.current = file;
  };

  const handleUpload = async () => {
    const file = fileInputRef.current;
    if (!file) { toast('请选择文件', 'error'); return; }
    const sizeError = checkFileSize(file);
    if (sizeError) { toast(sizeError, 'error'); return; }
    const formData = new FormData();
    formData.append('file', file);
    setIsLoading(true);
    try {
      const data = await api.uploadFile(formData);
      await fetchUploadedFiles();
      setFileName('');
      fileInputRef.current = null;
      await pulseSuccess(uploadControlsRef);
      toast(data.message || '上传成功', 'success');
    } catch { toast('上传失败', 'error'); }
    finally   { setIsLoading(false); }
  };

  const handleDownload = async (name) => {
    try {
      await downloadFile(`/api/files/${encodeURIComponent(name)}`, name);
    } catch { toast('下载失败', 'error'); }
  };

  const handleCopyLink = async (name) => {
    await copyLink(`/api/files/${encodeURIComponent(name)}`, toast);
  };

  const handleDelete = async (name) => {
    setDeletingName(name);
    try {
      await api.deleteFile(name);
      await fetchUploadedFiles();
      toast('已删除', 'info');
    } catch { toast('删除失败', 'error'); }
    finally   { setDeletingName(null); }
  };

  return (
    <div className="page">
      <h1 className="page-title">文件</h1>

      <UploadZone
        icon="📂"
        label="选择文件"
        hint={fileName ? `已选择：${fileName}` : ''}
        isLoading={isLoading}
        onFileChange={handleFileChange}
        onUpload={handleUpload}
        controlsRef={uploadControlsRef}
      />

      {uploadedFiles.length > 0 ? (
        <>
          <p className="section-header">已上传 · {uploadedFiles.length} 个文件</p>
          <motion.div className="bento-grid" variants={containerVariants} initial="hidden" animate="visible">
            {uploadedFiles.map((file) => (
              <motion.div key={file.name} className="glass-card file-card" variants={cardVariants}>
                <div className="file-card-body">
                  <span className="file-icon">{fileIcon(file.originalName || file.name)}</span>
                  <div>
                    <p className="file-name" title={file.originalName || file.name}>{file.originalName || file.name}</p>
                    <p className="file-meta">{formatFileSize(file.size)}</p>
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
      ) : (
        <EmptyState
          icon="📂"
          title="暂无文件"
          description="点击上方区域上传文件"
        />
      )}
    </div>
  );
}

export default FileUpload;
