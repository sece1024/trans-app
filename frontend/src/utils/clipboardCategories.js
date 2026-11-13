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
 * Unicode NFC + 折叠连续空白为单个空格 + 去除首尾空格；空串表示「未分类」。
 *
 * NFC 是分类的「身份」前提：同一个名字用组合字符（macOS 粘贴常见）与预组合字符
 * 写出来是两个不同字符串，不归一就会在精确匹配下变成两个分类。
 *
 * @param {unknown} value 原始输入
 * @returns {string} 归一化后的分类名（未分类时为空串）
 */
export function normalizeCategoryInput(value) {
  if (typeof value !== 'string') return '';
  return value.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/**
 * 判断两个分类值是否等价（归一化 + 忽略大小写后比较）。
 * 与后端一致：Link / link 是同一个分类，只有大小写不同的输入不应被判为「有变化」。
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function sameCategory(a, b) {
  return normalizeCategoryInput(a).toLowerCase() === normalizeCategoryInput(b).toLowerCase();
}

/**
 * 把分类名收敛到已有分类的写法（忽略大小写）。
 *
 * 用途：自动识别的默认值（torrent / Link）不该因为大小写不同而新建一个重复分类，
 * 库里已有 `Torrent` 时就沿用 `Torrent`。只对「系统建议值」用，不重写用户手打的输入。
 *
 * @param {{name: string}[]} categories 已有分类
 * @param {string} name 待收敛的分类名
 * @returns {string} 已有分类的写法；没有匹配时原样返回
 */
export function resolveExistingCategory(categories, name) {
  const normalized = normalizeCategoryInput(name);
  if (!normalized) return '';
  const key = normalized.toLowerCase();
  const hit = (categories ?? []).find(
    (category) =>
      typeof category?.name === 'string' && category.name.toLowerCase() === key
  );
  return hit ? hit.name : normalized;
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
  // 分类的「身份」忽略大小写（与后端 COLLATE NOCASE 一致）：
  // 本地存的是旧写法（如 link）而库里已收敛为 Link 时，也要能对上同一个 chip。
  const sameValue = (a, b) => {
    if (a === ALL_CATEGORIES || b === ALL_CATEGORIES) return a === b;
    return String(a).toLowerCase() === String(b).toLowerCase();
  };

  const chips = [{ key: ALL_KEY, value: ALL_CATEGORIES, label: '全部', count: total }];

  for (const category of categories) {
    const name = typeof category?.name === 'string' ? category.name : '';
    if (!name) continue;
    chips.push({ key: name, value: name, label: name, count: category.count ?? 0 });
  }

  const isNamedActive =
    activeCategory !== ALL_CATEGORIES && activeCategory !== UNCATEGORIZED;
  const hasActiveChip = isNamedActive && chips.some((chip) => sameValue(chip.value, activeCategory));

  if (isNamedActive && !hasActiveChip) {
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

  return chips.map((chip) => ({ ...chip, active: sameValue(chip.value, activeCategory) }));
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
