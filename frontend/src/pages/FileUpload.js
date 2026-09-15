import { useState, useCallback, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { downloadFile, copyLink, pulseSuccess, formatFileSize, checkFileSize } from '../utils/uploadHelpers';
import { fileIcon } from '../utils/fileIcon';
import useResourceList from '../hooks/useResourceList';
import ResourceGrid from '../components/ResourceGrid';
import UploadZone from '../components/UploadZone';

function FileUpload() {
  const [fileName, setFileName]         = useState('');
  const [isLoading, setIsLoading]       = useState(false);
  const [selectMode, setSelectMode]     = useState(false);
  const [selected, setSelected]         = useState(new Set());
  const fileInputRef      = useRef(null);
  const uploadControlsRef = useRef(null);
  const toast = useToast();

  const getFilesPage = useCallback(
    (limit, cursor) => api.getFiles(limit, cursor),
    []
  );
  const removeFile = useCallback((item) => api.deleteFile(item.filename), []);

  const {
    items: uploadedFiles,
    hasMore,
    loadingMore,
    loadMore,
    reload: fetchUploadedFiles,
    deletingId,
    handleDelete,
  } = useResourceList({
    fetchPage: getFilesPage,
    remove: removeFile,
    messages: {
      loadFailed: '获取文件列表失败',
      removeFailed: '删除失败',
      removed: '已删除',
    },
  });

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
      await downloadFile(`/api/download/${encodeURIComponent(name)}`, name);
    } catch { toast('下载失败', 'error'); }
  };

  const handleCopyLink = async (name) => {
    await copyLink(`/api/files/${encodeURIComponent(name)}`, toast);
  };

  const toggleSelect = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === uploadedFiles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(uploadedFiles.map((f) => f.filename)));
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    const names = [...selected];
    setIsLoading(true);
    try {
      await api.deleteFiles(names);
      setSelected(new Set());
      setSelectMode(false);
      await fetchUploadedFiles();
      toast(`已删除 ${names.length} 个文件`, 'info');
    } catch { toast('批量删除失败', 'error'); }
    finally { setIsLoading(false); }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
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

      {uploadedFiles.length > 0 && (
        <div className="section-header-row">
          <p className="section-header">已上传 · {uploadedFiles.length} 个文件</p>
          <div className="section-actions">
            {selectMode ? (
              <>
                <button className="btn--text" onClick={toggleSelectAll}>
                  {selected.size === uploadedFiles.length ? '取消全选' : '全选'}
                </button>
                <button className="btn--text btn--danger" onClick={handleBatchDelete} disabled={selected.size === 0 || isLoading}>
                  删除{selected.size > 0 ? ` (${selected.size})` : ''}
                </button>
                <button className="btn--text" onClick={exitSelectMode}>取消</button>
              </>
            ) : (
              <button className="btn--text" onClick={() => setSelectMode(true)}>选择</button>
            )}
          </div>
        </div>
      )}

      <ResourceGrid
        items={uploadedFiles}
        getItemKey={(file) => file.filename}
        itemClassName={(file) =>
          `file-card${selectMode ? ' file-card--selectable' : ''}${selected.has(file.filename) ? ' file-card--selected' : ''}`
        }
        itemMotionProps={(file) => (selectMode ? { onClick: () => toggleSelect(file.filename) } : {})}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        emptyIcon="📂"
        emptyTitle="暂无文件"
        emptyDescription="点击上方区域上传文件"
        renderItem={(file) => (
          <>
            {selectMode && (
              <div className="file-checkbox">
                <span className="checkbox-mark">{selected.has(file.filename) ? '✓' : ''}</span>
              </div>
            )}
            <div className="file-card-body">
              <span className="file-icon">{fileIcon(file.originalName || file.filename)}</span>
              <div>
                <p className="file-name" title={file.originalName || file.filename}>{file.originalName || file.filename}</p>
                <p className="file-meta">{formatFileSize(file.size)}</p>
              </div>
            </div>
            {!selectMode && (
              <div className="card-actions">
                <button className="btn--icon" onClick={() => handleCopyLink(file.filename)}>🔗 复制链接</button>
                <button className="btn--icon" onClick={() => handleDownload(file.filename)}>↓ 下载</button>
                <button className="btn--icon btn--danger" onClick={() => handleDelete(file)}>删除</button>
              </div>
            )}
            {deletingId === file.filename && (
              <div className="card-loading"><span className="spinner" /></div>
            )}
          </>
        )}
      />
    </div>
  );
}

export default FileUpload;