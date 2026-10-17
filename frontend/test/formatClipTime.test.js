import { describe, test, expect } from 'vitest';
import { formatClipTime, formatClipTimeExact } from '../src/utils/formatClipTime';

// 固定「现在」，所有断言都用本地时间构造，避免依赖测试机时区
const now = new Date(2026, 9, 17, 14, 30, 0).getTime(); // 2026-10-17 14:30 本地时间
const at = (...args) => new Date(...args).toISOString();

describe('formatClipTime', () => {
  test('shows 刚刚 within the first minute', () => {
    expect(formatClipTime(at(2026, 9, 17, 14, 30, 0), now)).toBe('刚刚');
    expect(formatClipTime(at(2026, 9, 17, 14, 29, 1), now)).toBe('刚刚');
  });

  test('counts minutes up to the hour boundary', () => {
    expect(formatClipTime(at(2026, 9, 17, 14, 29, 0), now)).toBe('1 分钟前');
    expect(formatClipTime(at(2026, 9, 17, 13, 45, 0), now)).toBe('45 分钟前');
    expect(formatClipTime(at(2026, 9, 17, 13, 30, 1), now)).toBe('59 分钟前');
  });

  test('falls back to a clock time for earlier the same day', () => {
    expect(formatClipTime(at(2026, 9, 17, 13, 30, 0), now)).toBe('13:30');
    expect(formatClipTime(at(2026, 9, 17, 0, 5, 0), now)).toBe('00:05');
  });

  test('labels the previous day as 昨天', () => {
    expect(formatClipTime(at(2026, 9, 16, 23, 59, 0), now)).toBe('昨天 23:59');
    expect(formatClipTime(at(2026, 9, 16, 0, 0, 0), now)).toBe('昨天 00:00');
  });

  test('drops the year for older dates in the current year', () => {
    expect(formatClipTime(at(2026, 9, 15, 12, 0, 0), now)).toBe('10月15日');
    expect(formatClipTime(at(2026, 0, 3, 12, 0, 0), now)).toBe('1月3日');
  });

  test('includes the year once it differs from now', () => {
    expect(formatClipTime(at(2025, 11, 31, 12, 0, 0), now)).toBe('2025年12月31日');
  });

  test('never labels a future timestamp as 刚刚 / N 分钟前', () => {
    // 设备与服务端时钟有偏差时，未来时间应显示具体时刻而不是负数分钟
    expect(formatClipTime(at(2026, 9, 17, 14, 40, 0), now)).toBe('14:40');
  });

  test('returns an empty label for missing or malformed timestamps', () => {
    expect(formatClipTime(undefined, now)).toBe('');
    expect(formatClipTime(null, now)).toBe('');
    expect(formatClipTime('not-a-date', now)).toBe('');
  });

  test('uses the injected now instead of the wall clock (testability)', () => {
    const created = at(2026, 9, 17, 14, 0, 0);
    expect(formatClipTime(created, now)).toBe('30 分钟前');
    // 一小时后同样的数据会退化成具体时刻
    expect(formatClipTime(created, now + 60 * 60 * 1000)).toBe('14:00');
  });
});

describe('formatClipTimeExact', () => {
  test('keeps a full locale string for the title tooltip', () => {
    expect(formatClipTimeExact(at(2026, 9, 17, 14, 30, 0))).toBe(
      new Date(2026, 9, 17, 14, 30, 0).toLocaleString()
    );
  });

  test('returns an empty string for malformed input', () => {
    expect(formatClipTimeExact('nope')).toBe('');
  });
});
