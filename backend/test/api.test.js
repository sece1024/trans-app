import { test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

let dir;
let app;
let server;
let base;
let db;
let events;
let MAX_CATEGORY_LENGTH;

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'trans-api-'));
  process.env.DATA_DIR = dir;
  app = (await import('../src/app')).default;
  db = (await import('../src/db/database')).default;
  events = await import('../src/services/clipboardEvents');
  MAX_CATEGORY_LENGTH = (await import('../src/config/limits')).MAX_CATEGORY_LENGTH;
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  server.close();
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test('server-info returns ips and port', async () => {
  const res = await fetch(`${base}/api/server-info`);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.ips)).toBe(true);
  expect(body.port).toBeTruthy();
  expect(res.headers.get('x-content-type-options')).toBe('nosniff');
});

test('upload without a file returns a clear 400 message', async () => {
  const res = await fetch(`${base}/api/files/upload`, {
    method: 'POST',
    body: new FormData(),
  });
  expect(res.status).toBe(400);
  expect((await res.json()).message).toBe('file is required');
});

test('file upload → list → download → delete round trip', async () => {
  const form = new FormData();
  form.append('file', new Blob(['hello world']), '测试.txt');
  const uploadRes = await fetch(`${base}/api/files/upload`, { method: 'POST', body: form });
  expect(uploadRes.status).toBe(200);
  const uploaded = await uploadRes.json();
  expect(uploaded.originalName).toBe('测试.txt');
  expect(uploaded.filename).toBeTruthy();

  const listRes = await fetch(`${base}/api/files`);
  expect(listRes.status).toBe(200);
  const list = await listRes.json();
  expect(list.items.some((f) => f.filename === uploaded.filename)).toBe(true);

  const downloadRes = await fetch(`${base}/api/download/${uploaded.filename}`);
  expect(downloadRes.status).toBe(200);
  expect(await downloadRes.text()).toBe('hello world');
  expect(downloadRes.headers.get('content-disposition')).toContain("filename*=UTF-8''");

  // 内联文件响应应带安全头，防止上传的 HTML/SVG 在同源下执行脚本
  const inlineRes = await fetch(`${base}/api/files/${uploaded.filename}`);
  expect(inlineRes.status).toBe(200);
  expect(inlineRes.headers.get('x-content-type-options')).toBe('nosniff');
  expect(inlineRes.headers.get('content-security-policy')).toBe('sandbox');

  const deleteRes = await fetch(`${base}/api/files/${uploaded.filename}`, { method: 'DELETE' });
  expect(deleteRes.status).toBe(200);

  const afterList = await (await fetch(`${base}/api/files`)).json();
  expect(afterList.items.some((f) => f.filename === uploaded.filename)).toBe(false);
});

test('clipboard save → get → delete round trip', async () => {
  const saveRes = await fetch(`${base}/api/clipboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'hello clipboard', deviceInfo: 'Test' }),
  });
  expect(saveRes.status).toBe(200);
  const saved = await saveRes.json();

  const clips = await (await fetch(`${base}/api/clipboard`)).json();
  expect(clips.items.some((c) => c.id === saved.id)).toBe(true);

  const delRes = await fetch(`${base}/api/clipboard/${saved.id}`, { method: 'DELETE' });
  expect(delRes.status).toBe(200);
});

test('rejects clipboard content over 10000 chars with 400', async () => {
  const res = await fetch(`${base}/api/clipboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'x'.repeat(10001), deviceInfo: 'Test' }),
  });
  expect(res.status).toBe(400);
});

test('rejects overlong deviceInfo with 400', async () => {
  const res = await fetch(`${base}/api/clipboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'ok', deviceInfo: 'x'.repeat(257) }),
  });
  expect(res.status).toBe(400);
});

test('caps list limit at 100', async () => {
  const res = await fetch(`${base}/api/clipboard?limit=999999`);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.items.length).toBeLessThanOrEqual(100);
});

test('rejects non-image upload with 400', async () => {
  const form = new FormData();
  form.append('image', new Blob(['not an image']), 'note.txt');
  const res = await fetch(`${base}/api/images/upload`, { method: 'POST', body: form });
  expect(res.status).toBe(400);
});

test('rejects oversized image with 400', async () => {
  const form = new FormData();
  form.append(
    'image',
    new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' }),
    'big.png'
  );
  const res = await fetch(`${base}/api/images/upload`, { method: 'POST', body: form });
  expect(res.status).toBe(400);
});

test('clipboard category save → filter → patch round trip', async () => {
  const tag = 'api-test-category';
  const saveRes = await fetch(`${base}/api/clipboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'magnet:?xt=urn:btih:api', deviceInfo: 'Test', category: tag }),
  });
  expect(saveRes.status).toBe(200);
  const saved = await saveRes.json();
  expect(saved.category).toBe(tag);

  const filtered = await (await fetch(`${base}/api/clipboard?category=${tag}`)).json();
  expect(filtered.items.some((c) => c.id === saved.id)).toBe(true);
  expect(filtered.items.every((c) => c.category === tag)).toBe(true);

  const summary = await (await fetch(`${base}/api/clipboard/categories`)).json();
  expect(summary.categories.some((c) => c.name === tag && c.count >= 1)).toBe(true);
  expect(summary.total).toBeGreaterThanOrEqual(1);

  // 显式传 null 清除分类，条目进入「未分类」筛选
  const patchRes = await fetch(`${base}/api/clipboard/${saved.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: null }),
  });
  expect(patchRes.status).toBe(200);

  const uncategorized = await (await fetch(`${base}/api/clipboard?category=`)).json();
  expect(uncategorized.items.some((c) => c.id === saved.id)).toBe(true);
  expect(uncategorized.items.every((c) => c.category === null)).toBe(true);
});

test('rejects invalid clipboard category with 400', async () => {
  const post = (body) =>
    fetch(`${base}/api/clipboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  expect((await post({ text: 'ok', category: 'x'.repeat(MAX_CATEGORY_LENGTH + 1) })).status).toBe(
    400
  );
  expect((await post({ text: 'ok', category: 123 })).status).toBe(400);

  const saved = await (await post({ text: 'ok', category: 'temp-cat' })).json();

  // PATCH 必须显式携带 category 字段
  const missingField = await fetch(`${base}/api/clipboard/${saved.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  expect(missingField.status).toBe(400);

  const patchMissingId = await fetch(`${base}/api/clipboard/no-such-id`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'torrent' }),
  });
  expect(patchMissingId.status).toBe(404);
});

// 注意：以下两个 SSE 测试的相对顺序是有意安排的——cap 测试必须在 push 测试之前。
// push 测试的 reader.cancel() 不保证服务端 close→退订会发生（触发时机与运行环境相关：
// 可能立即、可能延迟、也可能到进程结束都不触发），因此后续测试不能假设连接数已归零。
// cap 测试放在最前，从确定的 0 起步，不依赖任何 close 行为，两个测试各自确定性通过。
test('SSE subscription rejects connections over the client cap', async () => {
  // 用假客户端填满订阅集（while 自愈补填），验证超限返回 503
  const before = events.clientCount();
  const fakes = [];
  while (events.clientCount() < events.MAX_CLIENTS) {
    const fake = { write() {} };
    events.subscribe(fake);
    fakes.push(fake);
  }
  expect(events.clientCount()).toBe(events.MAX_CLIENTS);

  const res = await fetch(`${base}/api/clipboard/events`);
  expect(res.status).toBe(503);

  for (const fake of fakes) events.unsubscribe(fake);
  expect(events.clientCount()).toBe(before);
});

test('clipboard SSE pushes events on change', async () => {
  const res = await fetch(`${base}/api/clipboard/events`);
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain('text/event-stream');
  expect(events.clientCount()).toBe(1);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  const readNext = async () => {
    const { value } = await reader.read();
    return value ? decoder.decode(value) : '';
  };

  // 首次读取 retry 握手
  const handshake = await readNext();

  // 触发一次剪贴板新增（带上客户端 ID，服务端需原样回显）
  await fetch(`${base}/api/clipboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': 'client-abc' },
    body: JSON.stringify({ text: 'sse test', deviceInfo: 'Test' }),
  });

  // 读取广播事件：必须是可解析的变更描述，而不是笼统的「有东西变了」
  const payload = await readNext();
  expect(handshake).toContain('retry:');
  const dataLine = payload.split('\n').find((line) => line.startsWith('data: '));
  const event = JSON.parse(dataLine.slice('data: '.length));
  expect(event.type).toBe('created');
  expect(event.item.content).toBe('sse test');
  expect(event.originId).toBe('client-abc');

  // 改分类 → 订阅者收到的是「改了哪条、改成什么」，足以本地打补丁
  await fetch(`${base}/api/clipboard/${event.item.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': 'client-abc' },
    body: JSON.stringify({ category: '运维' }),
  });
  const updated = JSON.parse(
    (await readNext())
      .split('\n')
      .find((line) => line.startsWith('data: '))
      .slice('data: '.length)
  );
  expect(updated).toEqual({
    type: 'updated',
    id: event.item.id,
    category: '运维',
    originId: 'client-abc',
  });

  // 删除 → 带 id 即可让订阅者本地移除该条
  await fetch(`${base}/api/clipboard/${event.item.id}`, {
    method: 'DELETE',
    headers: { 'X-Client-Id': 'client-abc' },
  });
  const deleted = JSON.parse(
    (await readNext())
      .split('\n')
      .find((line) => line.startsWith('data: '))
      .slice('data: '.length)
  );
  expect(deleted).toEqual({ type: 'deleted', id: event.item.id, originId: 'client-abc' });

  // 本文件的最后一个测试：cancel 后服务端退订时机不确定（见上方顺序说明），
  // 不断言连接数，残留连接随测试进程结束回收
  await reader.cancel();
});
