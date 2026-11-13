import { describe, test, expect, vi, beforeEach } from 'vitest';

const getServerInfo = vi.fn();
vi.mock('../src/api/client', () => ({ api: { getServerInfo: (...args) => getServerInfo(...args) } }));

const { fetchServerInfoOnce, resetServerInfoCache } = await import('../src/utils/serverInfo');

describe('fetchServerInfoOnce', () => {
  beforeEach(() => {
    resetServerInfoCache();
    getServerInfo.mockReset();
  });

  test('shares one request across concurrent callers', async () => {
    getServerInfo.mockResolvedValue({ port: 5001, maxClipboardHistory: 5 });

    // 侧栏、移动端页脚、剪贴板页可能同时挂载
    const results = await Promise.all([
      fetchServerInfoOnce(),
      fetchServerInfoOnce(),
      fetchServerInfoOnce(),
    ]);

    expect(getServerInfo).toHaveBeenCalledTimes(1);
    expect(results.every((info) => info.maxClipboardHistory === 5)).toBe(true);
  });

  test('retries after a failure instead of caching the rejection', async () => {
    getServerInfo.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ port: 5001 });

    await expect(fetchServerInfoOnce()).rejects.toThrow('offline');
    await expect(fetchServerInfoOnce()).resolves.toEqual({ port: 5001 });
    expect(getServerInfo).toHaveBeenCalledTimes(2);
  });
});
