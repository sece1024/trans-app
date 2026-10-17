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

  test('returns null for plain text or text containing links', () => {
    expect(detectCategory('hello world')).toBeNull();
    expect(detectCategory('see https://example.com for details')).toBeNull();
    expect(detectCategory('https://a.com\nhttps://b.com')).toBeNull();
    expect(detectCategory('')).toBeNull();
    expect(detectCategory('   ')).toBeNull();
    expect(detectCategory(undefined)).toBeNull();
  });
});
