import { test, expect } from 'bun:test';
import normalizeCategory from '../src/utils/normalizeCategory';
import { MAX_CATEGORY_LENGTH } from '../src/config/limits';

test('trims and collapses whitespace', () => {
  expect(normalizeCategory('  torrent  ')).toBe('torrent');
  expect(normalizeCategory('my   cool\tcategory')).toBe('my cool category');
  expect(normalizeCategory('多行\n分类')).toBe('多行 分类');
});

test('treats empty / nullish values as uncategorized (null)', () => {
  expect(normalizeCategory(undefined)).toBeNull();
  expect(normalizeCategory(null)).toBeNull();
  expect(normalizeCategory('')).toBeNull();
  expect(normalizeCategory('   ')).toBeNull();
});

test('keeps names at the length limit', () => {
  const name = 'x'.repeat(MAX_CATEGORY_LENGTH);
  expect(normalizeCategory(name)).toBe(name);
});

test('rejects non-string and overlong input', () => {
  expect(() => normalizeCategory(42)).toThrow('Invalid category');
  expect(() => normalizeCategory({ name: 'torrent' })).toThrow('Invalid category');
  expect(() => normalizeCategory('x'.repeat(MAX_CATEGORY_LENGTH + 1))).toThrow('Category too long');
});

test('normalizes to NFC so composed and decomposed spellings share one identity', () => {
  // macOS 粘贴常见分解形（e + 组合重音）与预组合形；不归一会在精确匹配下分裂成两个分类
  const decomposed = 'cafe\u0301';
  const composed = 'caf\u00e9';
  expect(normalizeCategory(decomposed)).toBe(composed);
  expect(normalizeCategory(composed)).toBe(composed);
  expect(normalizeCategory(decomposed)).toHaveLength(4);
});

test('keeps the display spelling (case is not folded at normalization)', () => {
  // 大小写只影响显示；身份折叠交给 SQL 的 COLLATE NOCASE 与 resolveCategory
  expect(normalizeCategory('Link')).toBe('Link');
  expect(normalizeCategory('link')).toBe('link');
});
