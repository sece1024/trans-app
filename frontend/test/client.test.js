import { describe, test, expect, vi, afterEach } from 'vitest';
import { api, getClientId } from '../src/api/client';

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
      headers: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId() },
      body: JSON.stringify({ text: 'hello', deviceInfo: 'Mac' }),
    });
  });

  test('filters clipboard by category, keeping the empty-string (uncategorized) param', async () => {
    const fn = mockFetch({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ items: [] }),
    });

    await api.getClipboard(50, undefined, 'torrent');
    expect(fn).toHaveBeenCalledWith('/api/clipboard?limit=50&category=torrent', {});

    await api.getClipboard(50, undefined, '');
    expect(fn).toHaveBeenCalledWith('/api/clipboard?limit=50&category=', {});

    await api.getClipboard(50, undefined, undefined);
    expect(fn).toHaveBeenCalledWith('/api/clipboard?limit=50', {});
  });

  test('updates clipboard category via PATCH (null clears it)', async () => {
    const fn = mockFetch({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ message: 'Updated successfully' }),
    });

    await api.updateClipboardCategory('c1', null);
    expect(fn).toHaveBeenCalledWith('/api/clipboard/c1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId() },
      body: JSON.stringify({ category: null }),
    });
  });

  test('tags write requests with the client id so SSE echoes can be deduped', async () => {
    const fn = mockFetch({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({}),
    });

    await api.deleteClipboard('c1');
    expect(fn.mock.calls[0][1].headers['X-Client-Id']).toBe(getClientId());

    // GET 保持 simple request：不带自定义头，避免额外预检
    await api.getClipboardCategories();
    expect(fn.mock.calls[1][1]).toEqual({});
  });

  test('client id is stable for the page session and non-empty', () => {
    expect(getClientId()).toBe(getClientId());
    expect(getClientId().length).toBeGreaterThan(8);
  });
});
