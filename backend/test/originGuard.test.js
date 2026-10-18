import { test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { isAllowedOrigin } from '../src/middleware/originGuard';

let dir;
let app;
let server;
let base;

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'trans-origin-'));
  process.env.DATA_DIR = dir;
  app = (await import('../src/app')).default;
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

test('isAllowedOrigin accepts empty, localhost and LAN origins', () => {
  expect(isAllowedOrigin(undefined)).toBe(true);
  expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
  expect(isAllowedOrigin('http://127.0.0.1:5001')).toBe(true);
  expect(isAllowedOrigin('http://192.168.1.10:5001')).toBe(true);
  expect(isAllowedOrigin('http://10.0.0.1:5001')).toBe(true);
  expect(isAllowedOrigin('http://172.16.0.1:5001')).toBe(true);
  expect(isAllowedOrigin('http://[::1]:5001')).toBe(true);
  expect(isAllowedOrigin('https://evil.example.com')).toBe(false);
  expect(isAllowedOrigin('https://172.32.1.1:5001')).toBe(false);
});

test('isAllowedOrigin rejects lookalike hosts that merely start with an allowed prefix', () => {
  // 回归点：前缀正则曾把下面这些攻击者域名全部放行
  expect(isAllowedOrigin('http://localhost.evil.com')).toBe(false);
  expect(isAllowedOrigin('http://127.evil.com')).toBe(false);
  expect(isAllowedOrigin('http://10.evil.com')).toBe(false);
  expect(isAllowedOrigin('http://192.168.evil.com')).toBe(false);
  expect(isAllowedOrigin('http://172.16.evil.com')).toBe(false);
  expect(isAllowedOrigin('http://localhost.evil.com:5173')).toBe(false);
  expect(isAllowedOrigin('ftp://localhost:5001')).toBe(false);
  expect(isAllowedOrigin('null')).toBe(false);
});

test('blocks cross-origin write requests with 403', async () => {
  const res = await fetch(`${base}/api/clipboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://evil.example.com',
    },
    body: JSON.stringify({ text: 'csrf attempt' }),
  });
  expect(res.status).toBe(403);
});

test('blocks lookalike-prefix origins on write requests', async () => {
  const res = await fetch(`${base}/api/clipboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost.evil.com',
    },
    body: JSON.stringify({ text: 'csrf attempt via lookalike host' }),
  });
  expect(res.status).toBe(403);
});

test('allows LAN-originated and no-Origin write requests', async () => {
  const lanRes = await fetch(`${base}/api/clipboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
    },
    body: JSON.stringify({ text: 'from dev proxy' }),
  });
  expect(lanRes.status).toBe(200);

  const noOriginRes = await fetch(`${base}/api/clipboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'from curl' }),
  });
  expect(noOriginRes.status).toBe(200);
});

test('cross-origin GET requests are unaffected', async () => {
  const res = await fetch(`${base}/api/clipboard`, {
    headers: { Origin: 'https://evil.example.com' },
  });
  expect(res.status).toBe(200);
});
