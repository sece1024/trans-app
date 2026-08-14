import { test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

let dir;
let clipboardService;
let db;

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'trans-db-'));
  process.env.DATA_DIR = dir;
  clipboardService = (await import('../src/services/clipboardService')).default;
  db = (await import('../src/db/database')).default;
});

afterAll(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test('save and retrieve history', () => {
  const item = clipboardService.saveTextContent('hello', 'text', 'Test Device');
  expect(item.content).toBe('hello');
  expect(item.deviceInfo).toBe('Test Device');

  const history = clipboardService.getTextHistory();
  expect(history.some((c) => c.id === item.id)).toBe(true);
});

test('prunes history beyond the last 50 entries', () => {
  for (let i = 0; i < 60; i += 1) {
    clipboardService.saveTextContent(`content-${i}`, 'text', 'Device');
  }
  const history = clipboardService.getTextHistory();
  expect(history.length).toBeLessThanOrEqual(50);
});

test('delete removes an entry and reports affected count', () => {
  const item = clipboardService.saveTextContent('temp', 'text', 'Device');
  expect(clipboardService.delete(item.id)).toBe(1);
  expect(clipboardService.delete(item.id)).toBe(0);
});
