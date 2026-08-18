import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 通用的「分页列表」Hook，抽象三个页面（文件 / 图片 / 剪贴板）重复的
 * 「拉取第一页 → 加载更多 → hasMore / nextCursor / 加载中」状态逻辑。
 *
 * @param {(limit: number, cursor: ?string) => Promise<{items: any[], total?: number, hasMore: boolean, nextCursor: ?string}>} fetchPage
 *        分页获取函数，接收 (limit, cursor)，返回列表页。首次调用 cursor 为 undefined。
 *        注意：请用 useCallback 包裹以保持引用稳定，否则每次渲染都会触发重新加载。
 * @param {Object} [options]
 * @param {number} [options.pageSize=50] 每页条数
 * @param {any[]} [options.dependencies=[]] 变更时触发重新加载第一页的依赖
 * @param {(error: Error) => void} [options.onError] 加载失败回调（默认静默）
 *
 * 返回：
 *  - items        当前已加载的列表
 *  - hasMore      是否还有更多
 *  - loadingMore  是否正在加载更多
 *  - isLoading    是否正在加载第一页
 *  - total        总条数（若后端返回）
 *  - loadMore     加载下一页
 *  - reload       重新加载第一页（重置列表）
 */
function usePaginatedList(fetchPage, { pageSize = 50, dependencies = [], onError } = {}) {
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const nextCursorRef = useRef(null);

  // 避免在组件卸载后 setState 造成内存泄漏 / 告警
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 记录进行中的 reload，轮询重入时直接跳过（复用同一个 promise），
  // 避免慢请求与定时轮询叠加导致请求风暴 / 竞态覆盖。
  const reloadingRef = useRef(null);

  const reload = useCallback(async () => {
    if (reloadingRef.current) return reloadingRef.current;
    reloadingRef.current = (async () => {
      setIsLoading(true);
      try {
        const data = await fetchPage(pageSize, undefined);
        if (!mountedRef.current) return;
        setItems(data.items ?? []);
        setHasMore(data.hasMore ?? false);
        nextCursorRef.current = data.nextCursor ?? null;
        if (typeof data.total === 'number') setTotal(data.total);
      } catch (error) {
        if (onError) onError(error);
      } finally {
        reloadingRef.current = null;
        if (mountedRef.current) setIsLoading(false);
      }
    })();
    return reloadingRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, pageSize, ...dependencies, onError]);

  useEffect(() => {
    reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(pageSize, nextCursorRef.current);
      if (!mountedRef.current) return;
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setHasMore(data.hasMore ?? false);
      nextCursorRef.current = data.nextCursor ?? null;
      if (typeof data.total === 'number') setTotal(data.total);
    } catch (error) {
      if (onError) onError(error);
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [fetchPage, pageSize, hasMore, loadingMore, onError]);

  return { items, setItems, hasMore, loadingMore, isLoading, total, loadMore, reload };
}

export default usePaginatedList;
