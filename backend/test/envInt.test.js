import { test, expect, spyOn } from 'bun:test';
import readPositiveInt from '../src/utils/envInt';

const read = (raw, extra = {}) =>
  readPositiveInt({ name: 'TEST_LIMIT', raw, fallback: 50, min: 1, max: 1000, ...extra });

test('falls back when the variable is absent or blank', () => {
  expect(read(undefined)).toBe(50);
  expect(read(null)).toBe(50);
  expect(read('')).toBe(50);
  expect(read('   ')).toBe(50);
});

test('parses integers, tolerating surrounding whitespace', () => {
  expect(read('120')).toBe(120);
  expect(read(' 120 ')).toBe(120);
  expect(read('1')).toBe(1);
  expect(read('1000')).toBe(1000);
});

test('rejects non-integers and out-of-range values with a warning', () => {
  const warn = spyOn(console, 'warn').mockImplementation(() => {});

  // 常见误填：带单位、小数、负数、0、超出夹取上限
  expect(read('50条')).toBe(50);
  expect(read('12.5')).toBe(50);
  expect(read('-3')).toBe(50);
  expect(read('0')).toBe(50);
  expect(read('1001')).toBe(50);
  expect(read('abc')).toBe(50);

  expect(warn).toHaveBeenCalled();
  expect(warn.mock.calls.at(-1)[1]).toContain('TEST_LIMIT');

  warn.mockRestore();
});
