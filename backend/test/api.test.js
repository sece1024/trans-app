import { test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

let dir;
let app;
let server;
let base;
let db;

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'trans-api-'));
  process.env.DATA_DIR = dir;
  app = (await import('../src/app')).default;
  db = (await import('../src/db/database')).default;
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
});

test('file upload → list → download → delete round trip', async () => {
  const form = new FormData();
  form.append('file', new Blob(['hello world']), '测试.txt');
  const uploadRes = await fetch(`${base}/api/files/upload`, { method: 'POST', body: form });
  expect(uploadRes.status).toBe(200);
  const uploaded = await uploadRes.json();
  expect(uploaded.originalName).toBe('测试.txt');
  expect(uploaded.fileId).toBeTruthy();

  const listRes = await fetch(`${base}/api/files`);
  expect(listRes.status).toBe(200);
  const list = await listRes.json();
  expect(list.items.some((f) => f.filename === uploaded.fileId)).toBe(true);

  const downloadRes = await fetch(`${base}/api/download/${uploaded.fileId}`);
  expect(downloadRes.status).toBe(200);
  expect(await downloadRes.text()).toBe('hello world');
  expect(downloadRes.headers.get('content-disposition')).toContain("filename*=UTF-8''");

  const deleteRes = await fetch(`${base}/api/files/${uploaded.fileId}`, { method: 'DELETE' });
  expect(deleteRes.status).toBe(200);

  const afterList = await (await fetch(`${base}/api/files`)).json();
  expect(afterList.items.some((f) => f.filename === uploaded.fileId)).toBe(false);
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
