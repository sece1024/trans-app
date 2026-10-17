// 剪贴板卡片的紧凑时间标签。
// 卡片底部一行要同时放下分类标签、设备名和时间，`toLocaleString()` 在 390px
// 宽的屏幕上会把设备名挤成省略号（「Android Phone · C…」），因此改用中文短格式；
// 完整时间仍通过 title 保留。
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const pad = (value) => String(value).padStart(2, '0');

// 取「当天零点」的时间戳，避免用毫秒差除以一天时被夏令时 / 跨月边界算错
function startOfDay(ms) {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * 把 ISO 时间格式化为卡片用的短标签。
 *
 * @param {string|number|Date} value 条目创建时间（后端返回 ISO 字符串）
 * @param {number} [now] 当前时间戳，显式传入便于测试
 * @returns {string} 短标签；时间非法时返回空串
 */
export function formatClipTime(value, now = Date.now()) {
  // new Date(null) 会得到 1970 年而不是「非法」，因此空值要先拦掉
  if (value === null || value === undefined || value === '') return '';
  const date = new Date(value);
  const time = date.getTime();
  if (!Number.isFinite(time)) return '';

  const diff = now - time;
  if (diff >= 0 && diff < MINUTE) return '刚刚';
  if (diff >= 0 && diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`;

  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const dayDelta = Math.round((startOfDay(now) - startOfDay(time)) / DAY);
  if (dayDelta <= 0) return clock;
  if (dayDelta === 1) return `昨天 ${clock}`;
  if (date.getFullYear() === new Date(now).getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 完整时间，用于 title 提示（精确到秒）。
 *
 * @param {string|number|Date} value
 * @returns {string}
 */
export function formatClipTimeExact(value) {
  if (value === null || value === undefined || value === '') return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : '';
}
