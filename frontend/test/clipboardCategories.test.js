import { describe, test, expect, vi } from 'vitest';
import {
  ALL_CATEGORIES,
  UNCATEGORIZED,
  CATEGORY_FILTER_STORAGE_KEY,
  buildCategoryChips,
  buildCategoryOptions,
  matchesCategoryFilter,
  getSafeStorage,
  normalizeCategoryInput,
  readStoredCategoryFilter,
  resolveExistingCategory,
  sameCategory,
  writeStoredCategoryFilter,
} from '../src/utils/clipboardCategories';

// 内存版 Storage，避免测试依赖真实 localStorage
function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key) => (map.has(key) ? map.get(key) : null)),
    setItem: vi.fn((key, value) => map.set(key, String(value))),
    removeItem: vi.fn((key) => map.delete(key)),
    get size() {
      return map.size;
    },
  };
}

describe('normalizeCategoryInput / sameCategory', () => {
  test('trims and collapses inner whitespace, matching the backend normalizer', () => {
    expect(normalizeCategoryInput('  运维  ')).toBe('运维');
    expect(normalizeCategoryInput('a  b\tc')).toBe('a b c');
    expect(normalizeCategoryInput('\n\t ')).toBe('');
  });

  test('treats non-strings as uncategorized instead of throwing', () => {
    expect(normalizeCategoryInput(undefined)).toBe('');
    expect(normalizeCategoryInput(null)).toBe('');
    expect(normalizeCategoryInput(42)).toBe('');
  });

  test('compares categories after normalization, so whitespace-only edits count as unchanged', () => {
    expect(sameCategory(' torrent ', 'torrent')).toBe(true);
    expect(sameCategory('', null)).toBe(true);
    expect(sameCategory(undefined, null)).toBe(true);
    expect(sameCategory('torrent', 'Link')).toBe(false);
  });

  test('ignores case, matching the backend category identity (Link = link)', () => {
    expect(sameCategory('link', 'Link')).toBe(true);
    expect(sameCategory(' LINK ', 'link')).toBe(true);
    // 未分类仍是空串，不能和任意具名分类相等
    expect(sameCategory('', 'Link')).toBe(false);
  });

  test('folds composed and decomposed accents to one identity', () => {
    expect(normalizeCategoryInput('cafe\u0301')).toBe(normalizeCategoryInput('caf\u00e9'));
    expect(sameCategory('cafe\u0301', 'caf\u00e9')).toBe(true);
  });
});

describe('resolveExistingCategory', () => {
  const categories = [{ name: 'Torrent', count: 2 }, { name: '运维', count: 1 }];

  test('reuses the existing spelling instead of creating a near-duplicate', () => {
    // 自动识别建议 torrent，但库里已有 Torrent → 沿用 Torrent
    expect(resolveExistingCategory(categories, 'torrent')).toBe('Torrent');
    expect(resolveExistingCategory(categories, '运维')).toBe('运维');
  });

  test('keeps the suggested name when nothing matches', () => {
    expect(resolveExistingCategory(categories, 'Link')).toBe('Link');
    expect(resolveExistingCategory([], 'Link')).toBe('Link');
  });

  test('returns an empty string for uncategorized and survives malformed input', () => {
    expect(resolveExistingCategory(categories, '')).toBe('');
    expect(resolveExistingCategory(categories, undefined)).toBe('');
    expect(resolveExistingCategory(undefined, 'Link')).toBe('Link');
    expect(resolveExistingCategory([{ count: 1 }, null], 'Link')).toBe('Link');
  });
});

describe('buildCategoryChips', () => {
  test('always leads with 全部 carrying the total count', () => {
    const chips = buildCategoryChips({ total: 7 });
    expect(chips).toEqual([
      { key: '__all__', value: ALL_CATEGORIES, label: '全部', count: 7, active: true },
    ]);
  });

  test('keeps the summary order and hides 未分类 when there is nothing uncategorized', () => {
    const chips = buildCategoryChips({
      categories: [
        { name: '运维', count: 3 },
        { name: 'Link', count: 1 },
      ],
      uncategorized: 0,
      total: 4,
    });
    expect(chips.map((chip) => chip.label)).toEqual(['全部', '运维', 'Link']);
    expect(chips.map((chip) => chip.count)).toEqual([4, 3, 1]);
  });

  test('appends 未分类 last when uncategorized items exist', () => {
    const chips = buildCategoryChips({
      categories: [{ name: 'torrent', count: 1 }],
      uncategorized: 2,
      total: 3,
    });
    expect(chips.map((chip) => chip.label)).toEqual(['全部', 'torrent', '未分类']);
    expect(chips.at(-1)).toMatchObject({ value: UNCATEGORIZED, count: 2 });
  });

  test('keeps a zero-count placeholder for the active category that vanished from the summary', () => {
    // 场景：正在看「SQL」，最后一条 SQL 被改分类 / 删除
    const chips = buildCategoryChips({
      categories: [{ name: 'Link', count: 1 }],
      uncategorized: 0,
      total: 1,
      activeCategory: 'SQL',
    });
    expect(chips.map((chip) => chip.label)).toEqual(['全部', 'Link', 'SQL']);
    expect(chips.at(-1)).toMatchObject({ value: 'SQL', count: 0, active: true });
    // 有且只有一个 chip 处于选中态
    expect(chips.filter((chip) => chip.active)).toHaveLength(1);
  });

  test('keeps the 未分类 chip while it is the active filter even at count 0', () => {
    // 回归点：把最后一条未分类内容改分类后，chip 消失会让用户困在空列表
    const chips = buildCategoryChips({
      categories: [],
      uncategorized: 0,
      total: 1,
      activeCategory: UNCATEGORIZED,
    });
    expect(chips.map((chip) => chip.label)).toEqual(['全部', '未分类']);
    expect(chips.at(-1)).toMatchObject({ value: UNCATEGORIZED, count: 0, active: true });
  });

  test('uses distinct keys so a user category named 全部 cannot collide', () => {
    const chips = buildCategoryChips({
      categories: [{ name: '全部', count: 1 }],
      uncategorized: 1,
      total: 2,
    });
    const keys = chips.map((chip) => chip.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('marks the chip active even when the stored filter uses another case', () => {
    // 场景：本地记忆里的筛选值是旧写法 link，库里已收敛为 Link
    const chips = buildCategoryChips({
      categories: [{ name: 'Link', count: 1 }],
      total: 1,
      activeCategory: 'link',
    });
    expect(chips.map((chip) => chip.label)).toEqual(['全部', 'Link']);
    expect(chips.filter((chip) => chip.active)).toHaveLength(1);
    expect(chips[1].active).toBe(true);
  });

  test('drops malformed summary entries instead of rendering blank chips', () => {
    const chips = buildCategoryChips({
      categories: [{ name: '', count: 1 }, { count: 2 }, null, { name: 'ok', count: 1 }],
      total: 1,
    });
    expect(chips.map((chip) => chip.label)).toEqual(['全部', 'ok']);
  });
});

describe('category filter persistence', () => {
  test('round-trips a named category and the uncategorized empty string', () => {
    const storage = makeStorage();
    writeStoredCategoryFilter(storage, '运维');
    expect(readStoredCategoryFilter(storage)).toBe('运维');

    writeStoredCategoryFilter(storage, UNCATEGORIZED);
    expect(readStoredCategoryFilter(storage)).toBe(UNCATEGORIZED);
  });

  test('clears the stored key when switching back to 全部', () => {
    const storage = makeStorage({ [CATEGORY_FILTER_STORAGE_KEY]: '运维' });
    writeStoredCategoryFilter(storage, ALL_CATEGORIES);
    expect(storage.removeItem).toHaveBeenCalledWith(CATEGORY_FILTER_STORAGE_KEY);
    expect(readStoredCategoryFilter(storage)).toBe(ALL_CATEGORIES);
  });

  test('falls back to 全部 for missing, blank or over-long stored values', () => {
    expect(readStoredCategoryFilter(makeStorage())).toBe(ALL_CATEGORIES);
    expect(readStoredCategoryFilter(makeStorage({ [CATEGORY_FILTER_STORAGE_KEY]: '   ' }))).toBe(
      ALL_CATEGORIES
    );
    expect(
      readStoredCategoryFilter(
        makeStorage({ [CATEGORY_FILTER_STORAGE_KEY]: 'x'.repeat(64) })
      )
    ).toBe(ALL_CATEGORIES);
  });

  test('degrades silently when storage is unavailable or throws', () => {
    expect(readStoredCategoryFilter(undefined)).toBe(ALL_CATEGORIES);
    expect(() => writeStoredCategoryFilter(undefined, '运维')).not.toThrow();

    const hostile = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(readStoredCategoryFilter(hostile)).toBe(ALL_CATEGORIES);
    expect(() => writeStoredCategoryFilter(hostile, '运维')).not.toThrow();
  });

  test('getSafeStorage returns undefined outside a browser (node test env)', () => {
    expect(getSafeStorage()).toBeUndefined();
  });
});

describe('buildCategoryOptions', () => {
  const suggestions = [
    { name: 'torrent', count: 5 },
    { name: '运维', count: 3 },
    { name: 'Link', count: 1 },
  ];

  test('keeps the summary order when nothing is typed', () => {
    const result = buildCategoryOptions({ suggestions, value: '' });
    expect(result.options.map((option) => option.name)).toEqual(['torrent', '运维', 'Link']);
    expect(result.options.every((option) => option.selected === false)).toBe(true);
    expect(result.isNew).toBe(false);
  });

  test('ranks matches first instead of hiding the rest (no "typing hides options" trap)', () => {
    const result = buildCategoryOptions({ suggestions, value: '运' });
    expect(result.options[0].name).toBe('运维');
    // 其余分类仍然可见：自动识别预填 torrent 时用户还能换成别的分类
    expect(result.options).toHaveLength(3);
    expect(result.options[0].selected).toBe(false);
  });

  test('prefers prefix matches over substring matches', () => {
    const result = buildCategoryOptions({
      suggestions: [{ name: 'x-link' }, { name: 'Link' }, { name: 'torrent' }],
      value: 'link',
    });
    expect(result.options.map((option) => option.name)).toEqual(['Link', 'x-link', 'torrent']);
    expect(result.options[0].selected).toBe(true);
  });

  test('marks the exact match as selected, ignoring case and stray whitespace', () => {
    const result = buildCategoryOptions({ suggestions, value: '  TORRENT ' });
    expect(result.options[0]).toMatchObject({ name: 'torrent', selected: true });
    expect(result.matched).toBe(true);
    expect(result.isNew).toBe(false);
  });

  test('flags a brand new category so the UI can say so', () => {
    const result = buildCategoryOptions({ suggestions, value: '新分类' });
    expect(result.isNew).toBe(true);
    expect(result.matched).toBe(false);
    expect(result.query).toBe('新分类');
    expect(result.options).toHaveLength(3);
  });

  test('blank input never counts as a new category', () => {
    expect(buildCategoryOptions({ suggestions, value: '   ' }).isNew).toBe(false);
    expect(buildCategoryOptions({ suggestions, value: undefined }).isNew).toBe(false);
  });

  test('caps the chip row and reports how many were dropped', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ name: `c${i}`, count: i }));
    const result = buildCategoryOptions({ suggestions: many, value: '', maxItems: 5 });
    expect(result.options).toHaveLength(5);
    expect(result.hiddenCount).toBe(7);
  });

  test('dedupes case-variant suggestions so no chip appears twice', () => {
    const result = buildCategoryOptions({
      suggestions: [{ name: 'Link' }, { name: 'link' }, { name: 'LINK' }],
      value: '',
    });
    expect(result.options.map((option) => option.name)).toEqual(['Link']);
  });

  test('drops malformed entries and survives missing suggestions', () => {
    const result = buildCategoryOptions({
      suggestions: [{ name: '' }, { count: 1 }, null, { name: 'ok' }],
      value: '',
    });
    expect(result.options.map((option) => option.name)).toEqual(['ok']);
    expect(buildCategoryOptions({ value: 'x' }).options).toEqual([]);
  });

  test('reports overflow when the input sits at the length limit', () => {
    expect(buildCategoryOptions({ suggestions, value: 'x'.repeat(32) }).overflow).toBe(true);
    expect(buildCategoryOptions({ suggestions, value: 'x'.repeat(31) }).overflow).toBe(false);
  });
});

describe('matchesCategoryFilter', () => {
  test('null means "all": every item matches', () => {
    expect(matchesCategoryFilter('运维', ALL_CATEGORIES)).toBe(true);
    expect(matchesCategoryFilter(null, ALL_CATEGORIES)).toBe(true);
  });

  test('the empty string means "uncategorized" only', () => {
    expect(matchesCategoryFilter(null, UNCATEGORIZED)).toBe(true);
    expect(matchesCategoryFilter('', UNCATEGORIZED)).toBe(true);
    expect(matchesCategoryFilter('运维', UNCATEGORIZED)).toBe(false);
  });

  test('named filters compare ignoring case, like the backend does', () => {
    expect(matchesCategoryFilter('Link', 'link')).toBe(true);
    expect(matchesCategoryFilter('link', 'Link')).toBe(true);
    expect(matchesCategoryFilter('Link', 'torrent')).toBe(false);
    expect(matchesCategoryFilter(null, 'Link')).toBe(false);
  });
});
