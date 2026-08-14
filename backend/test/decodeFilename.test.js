import { test, expect } from 'bun:test';
import decodeFilename from '../src/utils/decodeFilename';

test('decodes latin1-encoded UTF-8 filename', () => {
  const latin1 = Buffer.from('中文文件.txt', 'utf8').toString('latin1');
  expect(decodeFilename(latin1)).toBe('中文文件.txt');
});

test('passes through ASCII names unchanged', () => {
  expect(decodeFilename('report.pdf')).toBe('report.pdf');
});
