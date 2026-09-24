import { test, expect } from 'bun:test';
import parsePagination, { MAX_PAGE_SIZE } from '../src/utils/pagination';

test('parses valid limit and cursor', () => {
  expect(parsePagination({ limit: '20', cursor: 'abc' })).toEqual({
    limit: 20,
    cursor: 'abc',
  });
});

test('caps limit at MAX_PAGE_SIZE', () => {
  expect(parsePagination({ limit: '2147483647' }).limit).toBe(MAX_PAGE_SIZE);
  expect(parsePagination({ limit: '101' }).limit).toBe(MAX_PAGE_SIZE);
});

test('falls back to undefined limit for invalid values', () => {
  expect(parsePagination({}).limit).toBeUndefined();
  expect(parsePagination({ limit: '-5' }).limit).toBeUndefined();
  expect(parsePagination({ limit: 'abc' }).limit).toBeUndefined();
  expect(parsePagination({ limit: '12.9' }).limit).toBe(12);
});

test('empty cursor becomes undefined', () => {
  expect(parsePagination({ cursor: '' }).cursor).toBeUndefined();
  expect(parsePagination({ cursor: 123 }).cursor).toBeUndefined();
});
