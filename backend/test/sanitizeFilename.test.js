import { test, expect } from 'bun:test';
import { isValidFilename } from '../src/middleware/sanitizeFilename';

test('accepts plain filenames', () => {
  expect(isValidFilename('1750-report.pdf')).toBe(true);
  expect(isValidFilename('中文.txt')).toBe(true);
});

test('rejects path traversal sequences', () => {
  expect(isValidFilename('../etc/passwd')).toBe(false);
  expect(isValidFilename('..')).toBe(false);
  expect(isValidFilename('a/../b')).toBe(false);
  expect(isValidFilename('a\\b')).toBe(false);
  expect(isValidFilename('/etc/passwd')).toBe(false);
});
