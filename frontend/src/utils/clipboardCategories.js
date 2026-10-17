// 剪贴板分类的纯逻辑：分类归一化、筛选 chip 构建、筛选状态持久化。
// 这些函数不依赖 React / DOM，便于单测覆盖边界（占位 chip、越界存储值等）。
import { MAX_CATEGORY_LENGTH } from './uploadLimits';

// activeCategory 三态（与后端 category 语义一致）：
// null = 全部，'' = 未分类，其余字符串 = 指定分类名
export const ALL_CATEGORIES = null;
export const UNCATEGORIZED = '';

// 筛选状态的本地记忆键：刷新页面后仍停留在同一分类
export const CATEGORY_FILTER_STORAGE_KEY = 'trans.clipboard.categoryFilter';

// chip 的 React key：「全部 / 未分类」不能直接用分类名（用户可能恰好起同名分类）
const ALL_KEY = '__all__';
const UNCATEGORIZED_KEY = '__uncategorized__';

/**
 * 归一化分类输入，与后端 `utils/normalizeCategory.js` 保持一致：
 * 折叠连续空白为单个空格并去除首尾空格；空串表示「未分类」。
 *
 * @param {unknown} value 原始输入
 * @returns {string} 归一化后的分类名（未分类时为空串）
 */
export function normalizeCategoryInput(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * 判断两个分类值是否等价（都做归一化后比较）。
 * 避免「用户只改了首尾空格」时前端误判为无变化而不发请求。
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function sameCategory(a, b) {
  return normalizeCategoryInput(a) === normalizeCategoryInput(b);
}

/**
 * 构建筛选栏 chip 列表。
 *
 * 两条兜底规则保证用户不会「被困在空列表」：
 * - 当前筛选的具名分类已从汇总消失（条目被删或改分类）时补 count=0 的占位 chip；
 * - 正在筛选「未分类」时，即使未分类计数已归零也保留该 chip。
 *
 * @param {Object} summary 分类汇总
 * @param {{name: string, count: number}[]} [summary.categories] 具名分类（按最近使用排序）
 * @param {number} [summary.uncategorized] 未分类条数
 * @param {number} [summary.total] 全部条数
 * @param {string|null} [summary.activeCategory] 当前筛选（三态）
 * @returns {{key: string, value: string|null, label: string, count: number, active: boolean}[]}
 */
export function buildCategoryChips({
  categories = [],
  uncategorized = 0,
  total = 0,
  activeCategory = ALL_CATEGORIES,
} = {}) {
  const chips = [{ key: ALL_KEY, value: ALL_CATEGORIES, label: '全部', count: total }];
  const names = new Set();

  for (const category of categories) {
    const name = typeof category?.name === 'string' ? category.name : '';
    if (!name) continue;
    names.add(name);
    chips.push({ key: name, value: name, label: name, count: category.count ?? 0 });
  }

  if (
    activeCategory !== ALL_CATEGORIES &&
    activeCategory !== UNCATEGORIZED &&
    !names.has(activeCategory)
  ) {
    chips.push({ key: activeCategory, value: activeCategory, label: activeCategory, count: 0 });
  }

  if (uncategorized > 0 || activeCategory === UNCATEGORIZED) {
    chips.push({
      key: UNCATEGORIZED_KEY,
      value: UNCATEGORIZED,
      label: '未分类',
      count: uncategorized,
    });
  }

  return chips.map((chip) => ({ ...chip, active: chip.value === activeCategory }));
}

/**
 * 安全获取 localStorage：非浏览器环境（SSR / node 测试）与
 * 禁用存储的沙箱 iframe（访问即抛 SecurityError）都返回 undefined。
 *
 * @returns {Storage|undefined}
 */
export function getSafeStorage() {
  try {
    if (typeof window === 'undefined') return undefined;
    return window.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * 从存储中读取上次的筛选值；读取失败（隐私模式 / 无存储）或值非法时退回「全部」。
 *
 * @param {Storage|undefined} storage 默认 localStorage 的注入点，便于测试
 * @returns {string|null} 三态筛选值
 */
export function readStoredCategoryFilter(storage) {
  try {
    const raw = storage?.getItem?.(CATEGORY_FILTER_STORAGE_KEY);
    if (typeof raw !== 'string') return ALL_CATEGORIES;
    if (raw === UNCATEGORIZED) return UNCATEGORIZED;
    const normalized = normalizeCategoryInput(raw);
    if (!normalized || normalized.length > MAX_CATEGORY_LENGTH) return ALL_CATEGORIES;
    return normalized;
  } catch {
    return ALL_CATEGORIES;
  }
}

/**
 * 持久化筛选值；「全部」与写入失败都静默忽略（记忆功能不应影响主流程）。
 *
 * @param {Storage|undefined} storage
 * @param {string|null} value 三态筛选值
 */
export function writeStoredCategoryFilter(storage, value) {
  try {
    if (!storage?.setItem) return;
    if (value === ALL_CATEGORIES) storage.removeItem(CATEGORY_FILTER_STORAGE_KEY);
    else storage.setItem(CATEGORY_FILTER_STORAGE_KEY, value);
  } catch {
    // 忽略：存储不可用（隐私模式 / 配额满）时降级为「不记忆」
  }
}
