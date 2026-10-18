import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { copyToClipboard } from '../utils/copyToClipboard';
import { api } from '../api/client';
import { MAX_CLIPBOARD_LENGTH, MAX_CLIPBOARD_HISTORY } from '../utils/uploadLimits';
import { detectCategory } from '../utils/detectCategory';
import { formatClipTime, formatClipTimeExact } from '../utils/formatClipTime';
import {
  ALL_CATEGORIES,
  buildCategoryChips,
  getSafeStorage,
  normalizeCategoryInput,
  readStoredCategoryFilter,
  sameCategory,
  writeStoredCategoryFilter,
} from '../utils/clipboardCategories';
import useResourceList from '../hooks/useResourceList';
import ResourceGrid from '../components/ResourceGrid';
import CategoryField from '../components/CategoryField';

const LONG_TEXT_THRESHOLD = 200;
const COUNTER_VISIBLE_THRESHOLD = 200;
// 「N 分钟前」这类相对时间需要定期重算，否则页面久留后会一直显示旧值
const TIME_LABEL_REFRESH_MS = 30000;

function SharedClipboard() {
  const [clipText, setClipText] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  // 渲染时间标签用的「当前时间」，由定时器推进（见下方 effect）
  const [now, setNow] = useState(() => Date.now());
  // 分享表单的分类；categoryTouched 为 true 后不再被自动建议覆盖
  const [categoryInput, setCategoryInput] = useState('');
  const [categoryTouched, setCategoryTouched] = useState(false);
  // 分类汇总（筛选栏 + 上限提示），initial 为空
  const [categorySummary, setCategorySummary] = useState({
    categories: [],
    uncategorized: 0,
    total: 0,
  });
  // 筛选值三态，从本地记忆恢复：null = 全部，'' = 未分类，其余为分类名
  const [activeCategory, setActiveCategory] = useState(() =>
    readStoredCategoryFilter(getSafeStorage())
  );
  // 卡片内联分类编辑
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [savingCategoryId, setSavingCategoryId] = useState(null);
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
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const data = await api.getClipboardCategories();
      setCategorySummary({
        categories: data.categories ?? [],
        uncategorized: data.uncategorized ?? 0,
        total: data.total ?? 0,
      });
    } catch {
      // 分类汇总只影响筛选栏与上限提示，失败保持旧值静默（SSE 事件会再次触发刷新）
    }
  }, []);

  // undefined = 全部（不传参），'' = 未分类，其余按分类名筛选
  const categoryFilter = activeCategory === ALL_CATEGORIES ? undefined : activeCategory;

  const getClipsPage = useCallback(
    (limit, cursor) => api.getClipboard(limit, cursor, categoryFilter),
    [categoryFilter]
  );
  const removeClip = useCallback((item) => api.deleteClipboard(item.id), []);

  const {
    items: clips,
    total: filteredTotal,
    isLoading: isLoadingClips,
    hasMore,
    loadingMore,
    loadMore,
    reload: fetchClips,
    handleDelete,
  } = useResourceList({
    fetchPage: getClipsPage,
    remove: removeClip,
    getItemId: (clip) => clip.id,
    // 列表由 SSE 自动刷新驱动，加载失败保持静默，避免轮询失败反复弹窗
    messages: {
      loadFailed: null,
      removeFailed: '删除失败',
      removed: '已删除',
    },
  });
  // usePaginatedList 已在 fetchPage 变化时自动重载第一页，这里无需再手动触发

  // SSE 回调始终用最新的 fetchClips（筛选切换会更换函数引用），
  // 通过 ref 转发，避免筛选切换导致 SSE 断线重连
  const fetchClipsRef = useRef(fetchClips);
  useEffect(() => {
    fetchClipsRef.current = fetchClips;
  }, [fetchClips]);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TIME_LABEL_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // SSE 实时接收剪贴板变更（EventSource 断线会自动重连）
    const source = new EventSource('/api/clipboard/events');
    source.onmessage = () => {
      fetchClipsRef.current();
      refreshCategories();
    };
    return () => source.close();
  }, [refreshCategories]);

  const selectCategory = (value) => {
    setActiveCategory(value);
    writeStoredCategoryFilter(getSafeStorage(), value);
    // 切换筛选后列表整体变化，手机上若停留在长列表底部会看到错位内容
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdd = async () => {
    if (!clipText.trim()) { toast('请输入内容', 'error'); return; }
    if (clipText.length > MAX_CLIPBOARD_LENGTH) {
      toast(`内容过长，最多 ${MAX_CLIPBOARD_LENGTH} 字符`, 'error');
      return;
    }
    if (categorySummary.total >= MAX_CLIPBOARD_HISTORY) {
      const ok = window.confirm('剪贴板已达到上限，保存将自动删除最早的记录，是否继续？');
      if (!ok) return;
    }
    try {
      await api.addClipboard(
        clipText,
        deviceInfo,
        normalizeCategoryInput(categoryInput) || undefined
      );
      setClipText('');
      setCategoryInput('');
      setCategoryTouched(false);
      await Promise.all([fetchClips(), refreshCategories()]);
      toast('已分享', 'success');
    } catch { toast('分享失败', 'error'); }
  };

  const handleTextChange = (value) => {
    setClipText(value);
    // 用户未手动编辑过分类时，分类跟随内容自动建议（磁力 → torrent，单个链接 → Link）
    if (!categoryTouched) setCategoryInput(detectCategory(value) || '');
  };

  const handleCopy = async (text) => {
    try {
      await copyToClipboard(text);
      toast('已复制到剪贴板', 'success');
    } catch { toast('复制失败', 'error'); }
  };

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCategoryEditor = (clip) => {
    setEditingCategoryId(clip.id);
    setCategoryDraft(clip.category || '');
  };

  const saveCategory = async (clip) => {
    // 归一化后比较：只改了首尾/多余空格的输入不应被判为「未变化」而静默丢弃
    const next = normalizeCategoryInput(categoryDraft);
    if (sameCategory(next, clip.category)) {
      setEditingCategoryId(null);
      return;
    }
    setSavingCategoryId(clip.id);
    try {
      await api.updateClipboardCategory(clip.id, next || null);
      setEditingCategoryId(null);
      await Promise.all([fetchClips(), refreshCategories()]);
      toast(next ? '分类已更新' : '已清除分类', 'success');
    } catch {
      toast('分类更新失败', 'error');
    } finally {
      setSavingCategoryId(null);
    }
  };

  const categoryChips = buildCategoryChips({ ...categorySummary, activeCategory });

  // 手机上筛选栏是单行横滑的：从本地记忆恢复的筛选项可能落在可视区之外，
  // 用户会看不到「当前在看哪个分类」。只滚动筛选栏自身，不动页面滚动位置。
  const activeChipRef = useRef(null);
  useEffect(() => {
    const chip = activeChipRef.current;
    const bar = chip?.parentElement;
    if (!chip || !bar || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollLeft = chip.offsetLeft - (bar.clientWidth - chip.offsetWidth) / 2;
  }, [activeCategory, categoryChips.length]);

  // 有内容就展示筛选栏；正在筛选时即使结果为空也保留（用户据此退回「全部」）
  const showFilterBar =
    clips.length > 0 || categorySummary.total > 0 || activeCategory !== ALL_CATEGORIES;
  const autoDetected = categoryTouched ? '' : detectCategory(clipText) || '';

  return (
    <div className="page">
      <h1 className="page-title">剪贴板</h1>

      {/* Input zone */}
      <div className="glass-card clipboard-input-zone">
        <textarea
          value={clipText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="输入要分享的文本..."
          aria-label="输入要分享的文本"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd(); }}
        />
        <div className="clipboard-input-footer">
          <span className="upload-hint upload-hint--shortcut">⌘ + ↵ 快速分享</span>
          {clipText.length > COUNTER_VISIBLE_THRESHOLD && (
            <span
              className={`upload-hint clipboard-counter${
                clipText.length > MAX_CLIPBOARD_LENGTH * 0.9 ? ' clipboard-counter--warn' : ''
              }`}
            >
              {clipText.length} / {MAX_CLIPBOARD_LENGTH}
            </span>
          )}
          <div className="clipboard-category-row">
            <CategoryField
              value={categoryInput}
              onChange={(value) => { setCategoryTouched(true); setCategoryInput(value); }}
              suggestions={categorySummary.categories}
              autoDetected={autoDetected}
              onSubmit={handleAdd}
            />
            <button className="btn--share" onClick={handleAdd}>分享</button>
          </div>
        </div>
      </div>

      {/* 分类筛选栏：手机上单行横向滑动 + 吸顶，桌面端换行平铺 */}
      {showFilterBar && (
        <div className="clipboard-filter-bar" role="group" aria-label="按分类筛选">
          {categoryChips.map(({ key, label, count, active, value }) => (
            <button
              key={key}
              ref={active ? activeChipRef : undefined}
              className={`filter-chip${active ? ' filter-chip--active' : ''}`}
              aria-pressed={active}
              onClick={() => selectCategory(value)}
            >
              {label}
              <span className="filter-chip-count">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bento grid */}
      {(clips.length > 0 || activeCategory !== ALL_CATEGORIES) && (
        <p className="section-header">
          已分享 · {filteredTotal || clips.length} 条
          {activeCategory !== ALL_CATEGORIES && (
            <button className="btn--text section-header-reset" onClick={() => selectCategory(ALL_CATEGORIES)}>
              查看全部
            </button>
          )}
        </p>
      )}

      <ResourceGrid
        items={clips}
        isLoading={isLoadingClips}
        getItemKey={(clip) => clip.id}
        itemClassName={(clip) => `clip-card${clip.content.length > 120 ? ' card--wide' : ''}`}
        itemMotionProps={(clip) => ({
          role: 'button',
          tabIndex: 0,
          'aria-label': '点击复制此剪贴板内容',
          onClick: () => handleCopy(clip.content),
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCopy(clip.content);
            }
          },
        })}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        emptyIcon="📋"
        emptyTitle="暂无剪贴板内容"
        emptyDescription={
          activeCategory === ALL_CATEGORIES
            ? '在上方输入框中输入要分享的文本'
            : '该分类下暂无内容'
        }
        renderItem={(clip) => {
          const isLong = clip.content.length > LONG_TEXT_THRESHOLD;
          const isExpanded = expandedIds.has(clip.id);
          const isEditingCategory = editingCategoryId === clip.id;
          return (
            <>
              <pre className={`clip-text${isExpanded ? ' clip-text--expanded' : ''}`}>{clip.content}</pre>
              {isLong && (
                <button className="btn--expand" onClick={(e) => toggleExpand(clip.id, e)}>
                  {isExpanded ? '收起' : '展开全文'}
                </button>
              )}
              <div className="clip-footer">
                <div className="clip-footer-left">
                  {clip.category && (
                    <button
                      className="clip-category"
                      aria-label={`修改分类：${clip.category}`}
                      onClick={(e) => { e.stopPropagation(); openCategoryEditor(clip); }}
                    >
                      🏷 {clip.category}
                    </button>
                  )}
                  <span className="device-info">{clip.deviceInfo}</span>
                </div>
                <span className="time-info" title={formatClipTimeExact(clip.createdAt)}>
                  {formatClipTime(clip.createdAt, now)}
                </span>
              </div>
              {isEditingCategory && (
                <div
                  className="clip-category-edit"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <CategoryField
                    compact
                    autoFocus
                    value={categoryDraft}
                    onChange={setCategoryDraft}
                    suggestions={categorySummary.categories}
                    placeholder="输入分类名，留空则清除分类"
                    ariaLabel="分类名"
                    onSubmit={() => saveCategory(clip)}
                    onCancel={() => setEditingCategoryId(null)}
                  />
                  <div className="clip-category-edit-actions">
                    <button
                      className="btn--icon"
                      onClick={() => saveCategory(clip)}
                      disabled={savingCategoryId === clip.id}
                    >
                      {savingCategoryId === clip.id ? '保存中…' : '保存'}
                    </button>
                    <button className="btn--text" onClick={() => setEditingCategoryId(null)}>
                      取消
                    </button>
                  </div>
                </div>
              )}
              <div className="card-actions">
                <button className="btn--icon" onClick={(e) => { e.stopPropagation(); handleCopy(clip.content); }}>
                  复制
                </button>
                <button className="btn--icon" onClick={(e) => { e.stopPropagation(); openCategoryEditor(clip); }}>
                  {clip.category ? '改分类' : '分类'}
                </button>
                <button className="btn--icon btn--danger" onClick={(e) => { e.stopPropagation(); handleDelete(clip); }}>
                  删除
                </button>
              </div>
            </>
          );
        }}
      />
    </div>
  );
}

export default SharedClipboard;
