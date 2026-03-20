import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
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

function SharedClipboard() {
  const [clips, setClips]         = useState([]);
  const [clipText, setClipText]   = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const toast = useToast();

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    let device = 'Unknown Device';
    if      (ua.includes('iphone'))                           device = 'iPhone';
    else if (ua.includes('ipad'))                             device = 'iPad';
    else if (ua.includes('android'))                          device = ua.includes('mobile') ? 'Android Phone' : 'Android Tablet';
    else if (ua.includes('windows'))                          device = 'Windows PC';
    else if (ua.includes('macintosh') || ua.includes('mac')) device = 'Mac';
    else if (ua.includes('linux'))                            device = 'Linux';

    let browser = 'Unknown Browser';
    if      (ua.includes('firefox'))                          browser = 'Firefox';
    else if (ua.includes('edge'))                             browser = 'Edge';
    else if (ua.includes('chrome'))                           browser = 'Chrome';
    else if (ua.includes('safari'))                           browser = 'Safari';

    setDeviceInfo(`${device} · ${browser}`);
    fetchClips();
  }, []);

  const fetchClips = async () => {
    try { setClips(await (await fetch('/api/clipboard')).json()); }
    catch { /* silent */ }
  };

  const handleAdd = async () => {
    if (!clipText.trim()) { toast('请输入内容', 'error'); return; }
    try {
      await fetch('/api/clipboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clipText, deviceInfo }),
      });
      setClipText('');
      await fetchClips();
      toast('已分享', 'success');
    } catch { toast('分享失败', 'error'); }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('已复制到剪贴板', 'success');
    } catch { toast('复制失败', 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/clipboard/${id}`, { method: 'DELETE' });
      await fetchClips();
      toast('已删除', 'info');
    } catch { toast('删除失败', 'error'); }
  };

  return (
    <div className="page">
      <h1 className="page-title">剪贴板</h1>

      {/* Input zone */}
      <div className="glass-card clipboard-input-zone">
        <textarea
          value={clipText}
          onChange={(e) => setClipText(e.target.value)}
          placeholder="输入要分享的文本..."
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd(); }}
        />
        <div className="clipboard-input-footer">
          <span className="upload-hint">⌘ + ↵ 快速分享</span>
          <button onClick={handleAdd}>分享</button>
        </div>
      </div>

      {/* Bento grid */}
      {clips.length > 0 ? (
        <>
          <p className="section-header">已分享 · {clips.length} 条</p>
          <motion.div className="bento-grid" variants={containerVariants} initial="hidden" animate="visible">
            {clips.map((clip) => {
              const isWide = clip.content.length > 120;
              return (
                <motion.div
                  key={clip.id}
                  className={`glass-card clip-card${isWide ? ' card--wide' : ''}`}
                  variants={cardVariants}
                  onClick={() => handleCopy(clip.content)}
                >
                  <pre className="clip-text">{clip.content}</pre>
                  <div className="clip-footer">
                    <div>
                      <span className="device-info">{clip.deviceInfo}</span>
                    </div>
                    <span className="time-info">{new Date(clip.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="card-actions">
                    <button className="btn--icon" onClick={(e) => { e.stopPropagation(); handleCopy(clip.content); }}>
                      复制
                    </button>
                    <button className="btn--icon btn--danger" onClick={(e) => { e.stopPropagation(); handleDelete(clip.id); }}>
                      删除
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      ) : (
        <EmptyState
          icon="📋"
          title="暂无剪贴板内容"
          description="在上方输入框中输入要分享的文本"
        />
      )}
    </div>
  );
}

export default SharedClipboard;
