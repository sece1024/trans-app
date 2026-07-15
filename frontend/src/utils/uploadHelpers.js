import { copyToClipboard } from './copyToClipboard';

export async function downloadFile(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: blobUrl, download: filename });
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(blobUrl);
  a.remove();
}

export async function copyLink(path, toast) {
  const url = `${window.location.origin}${path}`;
  try {
    await copyToClipboard(url);
    toast('链接已复制', 'success');
  } catch {
    toast('复制失败', 'error');
  }
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  return `${size} ${units[i]}`;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function checkFileSize(file) {
  if (file.size > MAX_FILE_SIZE) {
    return `文件过大，最大支持 ${formatFileSize(MAX_FILE_SIZE)}`;
  }
  return null;
}

export async function pulseSuccess(controlsRef) {
  if (controlsRef.current) {
    await controlsRef.current.start({
      scale: [1, 1.018, 1],
      transition: { duration: 0.45, ease: 'easeOut' },
    });
  }
}
