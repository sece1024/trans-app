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
