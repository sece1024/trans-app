import { api } from '../api/client';

// /api/server-info 的共享缓存：侧栏、移动端页脚、剪贴板页都要用它，
// 但都在同一时刻只需要一份数据（服务器地址、剪贴板上限等）。
// 模块级 Promise 保证「并发挂载的多个组件只发一次请求」。
let serverInfoPromise = null;

/**
 * 获取服务器信息，并发调用共享同一次请求；失败时清空缓存允许下次重试。
 *
 * @returns {Promise<{ips?: string[], port?: number|string, maxClipboardHistory?: number}>}
 */
export function fetchServerInfoOnce() {
  if (!serverInfoPromise) {
    serverInfoPromise = api.getServerInfo().catch((error) => {
      serverInfoPromise = null;
      throw error;
    });
  }
  return serverInfoPromise;
}

// 测试用：重置模块级缓存
export function resetServerInfoCache() {
  serverInfoPromise = null;
}
