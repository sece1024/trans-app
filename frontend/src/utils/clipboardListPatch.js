import { ALL_CATEGORIES, matchesCategoryFilter } from './clipboardCategories';

// 剪贴板 SSE 事件 → 列表状态的纯函数补丁。
//
// 这些函数不依赖 React / DOM，便于单测覆盖边界（当前筛选是否包含该条目、
// 条目不在当前页时是否必须重新拉取）。
//
// 为什么不用「收到事件就重拉第一页」：`usePaginatedList.reload()` 会重置分页进度，
// 改一个字段就丢掉用户已加载的页与滚动上下文，而且每次变更都要打 2 次请求。
// 能在本地精确应用的变更（改分类 / 删除）就地打补丁，只有服务端才知道结果的
// 变更（新增会顺带 prune 掉最旧一条）才交回给调用方重新拉取。

/**
 * @typedef {Object} ClipboardEvent
 * @property {'created'|'updated'|'deleted'|'category-renamed'|'category-cleared'} type 变更类型
 * @property {Object} [item]        created 时的完整条目
 * @property {string} [id]          updated / deleted 时的条目 id
 * @property {string|null} [category] updated 后的分类（null = 未分类）
 * @property {string} [from]        category-renamed / category-cleared 的原分类名
 * @property {string} [to]          category-renamed 后的分类名
 * @property {string} [originId]    发起该写操作的客户端 ID
 */

/**
 * 该事件是否由本客户端自己发起（SSE 广播无法定向排除发起者，需要自行忽略回显）。
 *
 * @param {ClipboardEvent} event
 * @param {string} clientId
 * @returns {boolean}
 */
export function isOwnClipboardEvent(event, clientId) {
  if (!clientId || typeof event?.originId !== 'string') return false;
  return event.originId === clientId;
}

/**
 * 把一条 SSE 事件应用到当前列表。
 *
 * 返回值：
 * - `items`        应用后的列表（无需变更时原样返回，便于调用方做引用比较跳过 setState）
 * - `totalDelta`   总条数增量，调用方据此修正筛选结果计数
 * - `needsRefetch` 为 true 时 caller 必须重新拉取第一页，本地结果不可信
 *
 * @param {Object} params
 * @param {Object[]} [params.items]   当前列表
 * @param {string|null} [params.activeCategory] 当前筛选（三态：null = 全部，'' = 未分类）
 * @param {ClipboardEvent} params.event
 * @returns {{items: Object[], totalDelta: number, needsRefetch: boolean}}
 */
export function applyClipboardEvent({ items = [], activeCategory = ALL_CATEGORIES, event }) {
  const type = event?.type;

  // 新增条目会顺带 prune 掉最旧一条（见 ContentItem.create），新的第一页内容
  // 只有服务端知道，本地无法推断，交给调用方重拉。
  if (type === 'created') {
    return { items, totalDelta: 0, needsRefetch: true };
  }

  if (type === 'deleted') {
    const next = items.filter((item) => item.id !== event.id);
    if (next.length === items.length) return { items, totalDelta: 0, needsRefetch: false };
    return { items: next, totalDelta: -1, needsRefetch: false };
  }

  if (type === 'updated') {
    const category = event.category ?? null;
    const index = items.findIndex((item) => item.id === event.id);

    if (index === -1) {
      // 不在当前列表里：可能是刚被改成本筛选分类的条目（位置只有服务端知道），
      // 也可能与当前视图无关。只有会影响当前筛选结果时才需要重拉。
      return { items, totalDelta: 0, needsRefetch: matchesCategoryFilter(category, activeCategory) };
    }

    if (matchesCategoryFilter(category, activeCategory)) {
      // 仍在筛选范围内：就地改字段，保持位置、分页进度与滚动位置
      const next = items.map((item, i) => (i === index ? { ...item, category } : item));
      return { items: next, totalDelta: 0, needsRefetch: false };
    }

    // 改出了当前筛选范围：从列表移除，总数减一
    const next = items.filter((_, i) => i !== index);
    return { items: next, totalDelta: -1, needsRefetch: false };
  }

  // 分类级变更（重命名 / 合并 / 清空）与未知事件（旧后端、未来新增类型）：
  // 影响行数在服务端才知道，保守地全量失效
  return { items, totalDelta: 0, needsRefetch: true };
}
