import { describe, test, expect } from 'vitest';
import { formatFileSize, checkFileSize } from '../src/utils/uploadHelpers';

describe('formatFileSize', () => {
  test('formats zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  test('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
  });

  test('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
  });
});

describe('checkFileSize', () => {
  test('accepts files under the 100MB limit', () => {
    expect(checkFileSize({ size: 100 })).toBeNull();
  });

  test('rejects files over the 100MB limit', () => {
    expect(checkFileSize({ size: 100 * 1024 * 1024 + 1 })).toContain('文件过大');
  });
});
