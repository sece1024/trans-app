const ASCII_SAFE = /^[\x20-\x7E]+$/;

// 生成符合 RFC 5987 的 Content-Disposition，兼容中文等非 ASCII 文件名。
// 同时提供 ASCII fallback 供不支持 filename* 的客户端使用。
function contentDisposition(filename) {
  const fallback = (
    ASCII_SAFE.test(filename) ? filename : filename.replace(/[^\x20-\x7E]/g, '_')
  ).replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

module.exports = contentDisposition;
