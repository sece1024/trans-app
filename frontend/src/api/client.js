const BASE_URL = '/api';

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
  const res = await fetch(url, options);

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
