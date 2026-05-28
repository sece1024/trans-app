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

export async function pulseSuccess(controlsRef) {
  if (controlsRef.current) {
    await controlsRef.current.start({
      scale: [1, 1.018, 1],
      transition: { duration: 0.45, ease: 'easeOut' },
    });
  }
}
