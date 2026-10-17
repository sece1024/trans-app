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
 *
 * 竞态约定：effect 在 fetchPage 引用变化时自动重载第一页（如切换分类筛选）。
 * 只有最新一次请求的结果会写入状态，切换筛选时在途的旧请求会被丢弃。
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

  // 记录进行中的 reload：同一个 fetchPage 的重入直接复用同一个 promise
  // （避免慢请求与定时轮询叠加造成请求风暴）。fetchPage 变化（如切换分类筛选）
  // 时必须另起请求，否则新筛选永远等不到自己的第一页。
  const reloadingRef = useRef(null);
  // 请求序号：只有最新一次请求的结果才允许写入状态，
  // 否则先发的慢请求后到会覆盖新筛选的数据（列表与筛选栏对不上）
  const requestIdRef = useRef(0);

  const reload = useCallback(() => {
    const inFlight = reloadingRef.current;
    if (inFlight && inFlight.fetchPage === fetchPage) return inFlight.promise;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const promise = (async () => {
      setIsLoading(true);
      try {
        const data = await fetchPage(pageSize, undefined);
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setItems(data.items ?? []);
        setHasMore(data.hasMore ?? false);
        nextCursorRef.current = data.nextCursor ?? null;
        if (typeof data.total === 'number') setTotal(data.total);
      } catch (error) {
        if (requestId === requestIdRef.current && onError) onError(error);
      } finally {
        if (reloadingRef.current?.promise === promise) reloadingRef.current = null;
        if (mountedRef.current && requestId === requestIdRef.current) setIsLoading(false);
      }
    })();

    reloadingRef.current = { fetchPage, promise };
    return promise;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, pageSize, ...dependencies, onError]);

  useEffect(() => {
    reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    // 追加时也要比对序号：加载更多期间若切换了筛选，这一页属于旧筛选，必须丢弃
    const requestId = requestIdRef.current;
    setLoadingMore(true);
    try {
      const data = await fetchPage(pageSize, nextCursorRef.current);
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setHasMore(data.hasMore ?? false);
      nextCursorRef.current = data.nextCursor ?? null;
      if (typeof data.total === 'number') setTotal(data.total);
    } catch (error) {
      if (requestId === requestIdRef.current && onError) onError(error);
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [fetchPage, pageSize, hasMore, loadingMore, onError]);

  return { items, setItems, hasMore, loadingMore, isLoading, total, loadMore, reload };
}

export default usePaginatedList;
