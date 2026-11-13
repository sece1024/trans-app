import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CategoryField from './CategoryField';
import { normalizeCategoryInput, sameCategory } from '../utils/clipboardCategories';

/**
 * 分类管理弹层：重命名 / 合并 / 清空已有分类。
 *
 * 为什么需要它：分类是用户自己起的「组织体系」，但过去只能逐条进卡片改，
 * 想改一个分类名就得把它下面所有条目点一遍；两个拼写相近的分类也没法合并。
 * 重命名到已存在的分类名即合并，因此本组件不需要单独的「合并」按钮。
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {{name: string, count: number}[]} props.categories 已有分类（含计数）
 * @param {(from: string, to: string) => Promise<boolean>} props.onRename
 *        重命名；resolve 为 true 表示已生效（组件据此退出编辑态）
 * @param {(name: string) => Promise<boolean>} props.onClear 清空该分类（条目改为未分类）
 * @param {() => void} props.onClose
 */
function CategoryManager({ open, categories = [], onRename, onClear, onClose }) {
  // 正在编辑的分类名；null 表示列表态
  const [editingName, setEditingName] = useState(null);
  const [draft, setDraft] = useState('');
  // 正在等待接口返回的分类名，用于禁用按钮并防重复提交
  const [busyName, setBusyName] = useState(null);
  const [error, setError] = useState('');

  const containerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  const resetEdit = useCallback(() => {
    setEditingName(null);
    setDraft('');
    setError('');
  }, []);

  // 关闭时清空编辑态：下次打开不应残留上一次的半截输入
  useEffect(() => {
    if (!open) resetEdit();
  }, [open, resetEdit]);

  // 打开时锁滚动、聚焦关闭按钮，关闭后把焦点还给触发元素
  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  // Esc 关闭、Tab 在弹层内循环
  useEffect(() => {
    if (!open) return undefined;

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll('button:not([disabled]), input:not([disabled])')
      );
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
  }, [open, onClose]);

  const submitRename = async (from) => {
    const to = normalizeCategoryInput(draft);
    // 归一化后相同 = 没有变化，直接退出编辑态（与卡片内联编辑保持一致）
    if (sameCategory(to, from)) {
      resetEdit();
      return;
    }
    if (!to) {
      setError('分类名不能为空，如需清空请使用「清空」');
      return;
    }

    setBusyName(from);
    setError('');
    try {
      if (await onRename(from, to)) resetEdit();
      else setError('重命名失败，请重试');
    } finally {
      setBusyName(null);
    }
  };

  const submitClear = async (name) => {
    setBusyName(name);
    setError('');
    try {
      if (!(await onClear(name))) setError('清空失败，请重试');
    } finally {
      setBusyName(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="category-manager-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            ref={containerRef}
            className="category-manager"
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="管理分类"
          >
            <div className="category-manager-header">
              <h2 className="category-manager-title">管理分类</h2>
              <button
                ref={closeButtonRef}
                className="category-manager-close"
                onClick={onClose}
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            <p className="category-manager-hint">
              重命名为另一个分类即合并两者；「清空」会把该分类下的条目改为未分类。
            </p>

            {categories.length === 0 ? (
              <p className="category-manager-empty">还没有分类，分享时填写分类名即可创建。</p>
            ) : (
              <ul className="category-manager-list">
                {categories.map(({ name, count }) => {
                  const isEditing = editingName === name;
                  const isBusy = busyName === name;
                  return (
                    <li key={name} className="category-manager-item">
                      {isEditing ? (
                        <CategoryField
                          variant="manage"
                          autoFocus
                          value={draft}
                          onChange={setDraft}
                          suggestions={categories.filter((c) => c.name !== name)}
                          placeholder="新的分类名"
                          ariaLabel={`重命名分类 ${name}`}
                          onSubmit={() => submitRename(name)}
                          onCancel={resetEdit}
                        />
                      ) : (
                        <span className="category-manager-name">
                          {name}
                          <span className="category-manager-count">{count}</span>
                        </span>
                      )}

                      <div className="category-manager-actions">
                        {isEditing ? (
                          <>
                            <button
                              className="btn--icon"
                              onClick={() => submitRename(name)}
                              disabled={isBusy}
                            >
                              {isBusy ? '保存中…' : '保存'}
                            </button>
                            <button className="btn--text" onClick={resetEdit} disabled={isBusy}>
                              取消
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn--icon"
                              aria-label={`重命名分类 ${name}`}
                              onClick={() => {
                                setEditingName(name);
                                setDraft(name);
                                setError('');
                              }}
                              disabled={busyName !== null}
                            >
                              重命名
                            </button>
                            <button
                              className="btn--icon btn--danger"
                              aria-label={`清空分类 ${name}`}
                              onClick={() => {
                                const ok = window.confirm(
                                  `清空分类「${name}」？该分类下的 ${count} 条内容会变为未分类，内容本身不会删除。`
                                );
                                if (ok) submitClear(name);
                              }}
                              disabled={busyName !== null}
                            >
                              {isBusy ? '处理中…' : '清空'}
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {error && (
              <p className="category-manager-error" role="alert">
                {error}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CategoryManager;
