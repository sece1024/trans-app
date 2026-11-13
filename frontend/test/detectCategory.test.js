import { describe, test, expect } from 'vitest';
import { detectCategory } from '../src/utils/detectCategory';

describe('detectCategory', () => {
  test('suggests torrent for magnet links', () => {
    expect(detectCategory('magnet:?xt=urn:btih:abc&dn=Movie')).toBe('torrent');
    expect(detectCategory('  MAGNET:?xt=abc')).toBe('torrent');
  });

  test('suggests Link for a single http(s) URL', () => {
    expect(detectCategory('https://example.com/a?b=1')).toBe('Link');
    expect(detectCategory('http://example.com')).toBe('Link');
  });

  test('suggests Link for a bare www. host', () => {
    expect(detectCategory('www.example.com')).toBe('Link');
    expect(detectCategory('www.example.com/path?q=1')).toBe('Link');
    // 不带协议也不是 www. 开头的裸域名仍不猜（正文里太常见）
    expect(detectCategory('example.com')).toBeNull();
  });

  test('ignores surrounding whitespace and line breaks from a paste', () => {
    expect(detectCategory('\n  https://example.com  \n')).toBe('Link');
    expect(detectCategory('https://example.com\n')).toBe('Link');
    expect(detectCategory('\tmagnet:?xt=abc\r\n')).toBe('torrent');
  });

  test('returns null for plain text or text containing links', () => {
    expect(detectCategory('hello world')).toBeNull();
    expect(detectCategory('see https://example.com for details')).toBeNull();
    expect(detectCategory('https://a.com\nhttps://b.com')).toBeNull();
    // 链接后面还跟着别的说明 → 不是「整段就是一个链接」
    expect(detectCategory('magnet:?xt=abc\n调用说明')).toBeNull();
    expect(detectCategory('')).toBeNull();
    expect(detectCategory('   ')).toBeNull();
    expect(detectCategory(undefined)).toBeNull();
    expect(detectCategory(42)).toBeNull();
  });

  test('prefers the first matching rule (magnet is also a URL-ish token)', () => {
    expect(detectCategory('magnet:?xt=urn:btih:abc')).toBe('torrent');
  });
});
