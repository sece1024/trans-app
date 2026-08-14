import { describe, test, expect, vi, afterEach } from 'vitest';
import { api } from '../src/api/client';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('api client', () => {
  test('returns parsed JSON on success', async () => {
    const fn = mockFetch({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve([{ name: 'a' }]),
    });

    const data = await api.getFiles();
    expect(data).toEqual([{ name: 'a' }]);
    expect(fn).toHaveBeenCalledWith('/api/files', {});
  });

  test('throws ApiError with status on failure', async () => {
    mockFetch({
      ok: false,
      status: 404,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ message: 'file not found' }),
    });

    await expect(api.getFiles()).rejects.toMatchObject({ status: 404, message: 'file not found' });
  });

  test('sends clipboard with JSON body', async () => {
    const fn = mockFetch({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ id: '1' }),
    });

    await api.addClipboard('hello', 'Mac');
    expect(fn).toHaveBeenCalledWith('/api/clipboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hello', deviceInfo: 'Mac' }),
    });
  });
});
