const BASE_URL = '/api';

// 本页面的客户端实例 ID：随写请求以 X-Client-Id 发出，服务端在 SSE 广播里原样回显。
// 前端据此忽略自己发起的变更回显，避免「本地已应用的结果被同一条事件再应用一次」。
// 只在模块加载时生成一次（同一次页面会话内稳定）。
function generateClientId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // 旧浏览器 / 非安全上下文：退化为时间戳 + 随机串
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const CLIENT_ID = generateClientId();

/**
 * 当前页面会话的客户端 ID（与写请求头、SSE 事件里的 originId 比对用）。
 *
 * @returns {string}
 */
export function getClientId() {
  return CLIENT_ID;
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * 拼接分页查询串。category 允许空串（筛选「未分类」），
 * undefined / null 表示不筛选。
 * @param {string} path
 * @param {{ limit?: ?number, cursor?: ?string, category?: ?string }} params
 */
function withPagination(path, { limit, cursor, category }) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (cursor !== undefined && cursor !== null && cursor !== '') params.set('cursor', String(cursor));
  // category 允许空串（筛选「未分类」），因此只排除 undefined / null
  if (category !== undefined && category !== null) params.set('category', String(category));
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const method = (options.method ?? 'GET').toUpperCase();
  // 只在写请求上带自定义头：GET 保持「simple request」，不引入额外预检
  const headers =
    method === 'GET' ? options.headers : { ...options.headers, 'X-Client-Id': CLIENT_ID };
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message || `Request failed (${res.status})`, res.status);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res;
}

export const api = {
  // Clipboard
  getClipboard: (limit, cursor, category) =>
    request(withPagination('/clipboard', { limit, cursor, category })),
  addClipboard: (text, deviceInfo, category) =>
    request('/clipboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, deviceInfo, category }),
    }),
  updateClipboardCategory: (id, category) =>
    request(`/clipboard/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    }),
  getClipboardCategories: () => request('/clipboard/categories'),
  // 分类级操作：重命名（目标已存在即合并）/ 清空（该分类下条目改为未分类）
  renameClipboardCategory: (from, to) =>
    request(`/clipboard/categories/${encodeURIComponent(from)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: to }),
    }),
  clearClipboardCategory: (name) =>
    request(`/clipboard/categories/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  deleteClipboard: (id) => request(`/clipboard/${id}`, { method: 'DELETE' }),

  // Files
  getFiles: (limit, cursor) => request(withPagination('/files', { limit, cursor })),
  uploadFile: (formData) => request('/files/upload', { method: 'POST', body: formData }),
  deleteFile: (name) => request(`/files/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  deleteFiles: (filenames) =>
    request('/files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames }),
    }),

  // Images
  getImages: (limit, cursor) => request(withPagination('/images', { limit, cursor })),
  uploadImage: (formData) => request('/images/upload', { method: 'POST', body: formData }),
  deleteImage: (filename) => request(`/images/${encodeURIComponent(filename)}`, { method: 'DELETE' }),

  // System
  getServerInfo: () => request('/server-info'),
};
