// 根据剪贴板文本自动建议分类（分享表单的默认值，用户可修改 / 清除）。
// 规则保持保守：只识别「整段就是一个磁力链接」或「整段就是一个 http(s) 链接」，
// 避免给夹带链接的大段文本误加分类。
const MAGNET_RE = /^magnet:\?/i;
const SINGLE_URL_RE = /^https?:\/\/\S+$/i;

export const SUGGESTED_TORRENT_CATEGORY = 'torrent';
export const SUGGESTED_LINK_CATEGORY = 'Link';

export function detectCategory(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (MAGNET_RE.test(trimmed)) return SUGGESTED_TORRENT_CATEGORY;
  if (SINGLE_URL_RE.test(trimmed)) return SUGGESTED_LINK_CATEGORY;
  return null;
}
