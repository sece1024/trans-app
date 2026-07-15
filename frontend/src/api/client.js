const BASE_URL = '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
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
  getClipboard: () => request('/clipboard'),
  addClipboard: (text, deviceInfo) =>
    request('/clipboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, deviceInfo }),
    }),
  deleteClipboard: (id) => request(`/clipboard/${id}`, { method: 'DELETE' }),

  // Files
  getFiles: () => request('/files'),
  uploadFile: (formData) => request('/files/upload', { method: 'POST', body: formData }),
  deleteFile: (name) => request(`/files/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  deleteFiles: (filenames) =>
    request('/files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames }),
    }),

  // Images
  getImages: () => request('/images'),
  uploadImage: (formData) => request('/images/upload', { method: 'POST', body: formData }),
  deleteImage: (filename) => request(`/images/${encodeURIComponent(filename)}`, { method: 'DELETE' }),

  // System
  getServerInfo: () => request('/server-info'),
};
