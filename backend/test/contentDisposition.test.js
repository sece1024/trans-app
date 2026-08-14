import { test, expect } from 'bun:test';
import contentDisposition from '../src/utils/contentDisposition';

test('ASCII filename uses quoted fallback', () => {
  const header = contentDisposition('report.pdf');
  expect(header).toContain('attachment;');
  expect(header).toContain('filename="report.pdf"');
});

test('non-ASCII filename includes RFC 5987 filename*', () => {
  const header = contentDisposition('报告.pdf');
  expect(header).toContain(`filename*=UTF-8''${encodeURIComponent('报告.pdf')}`);
});

test('quotes in filename are sanitized in fallback', () => {
  const header = contentDisposition('a"b.txt');
  expect(header).not.toContain('filename="a"b.txt"');
});
