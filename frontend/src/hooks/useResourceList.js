import { useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import usePaginatedList from './usePaginatedList';

/**
 * 删除单条资源的纯编排逻辑（无 React 依赖，便于单测）：
 * 标记进行中 → 调用删除接口 → 刷新列表 → 提示结果，无论成败都清除进行中标记。
 *
 * @param {Object} deps
 * @param {(item: any) => Promise<any>} deps.remove    删除接口调用
 * @param {() => Promise<any>} deps.reload             删除成功后的列表刷新
 * @param {any} deps.item                              待删除条目
 * @param {(item: any) => any} deps.getItemId          取条目唯一键
 * @param {(id: any) => void} deps.setDeletingId       进行中标记的 setter
 * @param {(message: string, type: string) => void} deps.toast
 * @param {string} deps.removed                        删除成功提示
 * @param {string} deps.removeFailed                   删除失败提示
 */
export async function runDelete({ remove, reload, item, setDeletingId, toast, removed, removeFailed, getItemId }) {
  setDeletingId(getItemId(item));
  try {
    await remove(item);
    await reload();
    toast(removed, 'info');
  } catch {
    toast(removeFailed, 'error');
  } finally {
    setDeletingId(null);
  }
}

/**
 * 领域级「资源列表」Hook：在 usePaginatedList 之上补齐三个页面（文件 / 图片 / 剪贴板）
 * 重复实现的通用逻辑 —— 错误 toast、单条删除的进行中标记、删除后的刷新、列表文案。
 *
 * 页面只需提供「怎么取一页」和「怎么删一条」，其余状态与文案由本 Hook 统一负责。
 *
 * @param {Object} options
 * @param {(limit: number, cursor: ?string) => Promise<{items: any[], total?: number, hasMore: boolean, nextCursor: ?string}>} options.fetchPage
 *        分页获取函数（需 useCallback 保持引用稳定）
 * @param {(item: any) => Promise<any>} [options.remove]
 *        删除单条资源的 API 调用。传入后 Hook 会提供 deletingId / handleDelete，
 *        并在删除成功后自动刷新列表、失败时弹出 options.messages.removeFailed。
 * @param {(item: any) => any} [options.getItemId]  取条目唯一键的函数，默认 item.filename
 * @param {number} [options.pageSize=50] 每页条数
 * @param {any[]} [options.dependencies=[]] 变更时重新加载第一页的依赖
 * @param {Object} [options.messages]   列表文案配置
 * @param {?string} [options.messages.loadFailed] 加载失败提示；传 null 静默（默认 '加载列表失败'）
 * @param {string} [options.messages.removeFailed] 删除失败提示
 * @param {string} [options.messages.removed] 删除成功提示
 *
 * @returns {Object} 展开的 usePaginatedList 结果（items / hasMore / loadingMore / isLoading /
 *          total / loadMore / reload / setItems），外加：
 *          - deletingId    正在删除的条目 id（无则 null）
 *          - handleDelete  删除一条并刷新列表（remove 未提供时为 undefined）
 */
function useResourceList({
  fetchPage,
  remove,
  getItemId = (item) => item.filename,
  pageSize = 50,
  dependencies = [],
  messages = {},
}) {
  const {
    removeFailed = '删除失败',
    removed = '已删除',
  } = messages;
  // 列表加载失败提示，传 null 表示静默（如剪贴板走 SSE 自动刷新，失败不应弹窗）
  const loadFailed = messages.loadFailed === undefined ? '加载列表失败' : messages.loadFailed;
  const toast = useToast();

  const [deletingId, setDeletingId] = useState(null);

  const handleListError = useCallback(() => {
    if (loadFailed) toast(loadFailed, 'error');
  }, [toast, loadFailed]);

  const list = usePaginatedList(fetchPage, { pageSize, dependencies, onError: handleListError });
  const { reload } = list;

  const handleDelete = useCallback(
    (item) =>
      runDelete({ remove, reload, item, setDeletingId, toast, removed, removeFailed, getItemId }),
    [remove, getItemId, reload, toast, removed, removeFailed]
  );

  return {
    ...list,
    deletingId,
    handleDelete: remove ? handleDelete : undefined,
  };
}

export default useResourceList;
