// 根据剪贴板文本自动建议分类（分享表单的默认值，用户可修改 / 清除）。
//
// 规则保持保守：只识别「整段就是一个链接」，避免给夹带链接的大段文本误加分类。
// 规则以表的形式排列，新增一类（如 ftp）只需加一行，不必再改判断链。
//
// 注意：建议值只是「默认值」，写完会由写入口 resolveCategory 收敛到已有分类的写法
// （见 backend/src/db/ContentItem.js），因此大小写不必在这里对齐用户的历史数据。
const MAGNET_RE = /^magnet:\?\S*$/i;
const URL_RE = /^https?:\/\/\S+$/i;
// 省略协议的裸域名：只认 www. 开头，避免把 example.com 这类正文误判为链接
const BARE_WWW_RE = /^www\.[\w-]+(\.[\w-]+)+(:\d+)?([/?#]\S*)?$/i;

export const SUGGESTED_TORRENT_CATEGORY = 'torrent';
export const SUGGESTED_LINK_CATEGORY = 'Link';

/**
 * 自动识别规则表。`matches` 接收已 trim 的整段文本。
 *
 * @type {{category: string, matches: (text: string) => boolean}[]}
 */
const RULES = [
  { category: SUGGESTED_TORRENT_CATEGORY, matches: (text) => MAGNET_RE.test(text) },
  {
    category: SUGGESTED_LINK_CATEGORY,
    matches: (text) => URL_RE.test(text) || BARE_WWW_RE.test(text),
  },
];

/**
 * 猜测一段文本的分类。
 *
 * @param {unknown} text 剪贴板内容
 * @returns {string|null} 建议的分类名；没有把握时返回 null
 */
export function detectCategory(text) {
  if (typeof text !== 'string') return null;
  // 去掉首尾空白（粘贴常带入换行 / 缩进），空内容不猜
  const trimmed = text.trim();
  if (!trimmed) return null;

  const rule = RULES.find(({ matches }) => matches(trimmed));
  return rule ? rule.category : null;
}
