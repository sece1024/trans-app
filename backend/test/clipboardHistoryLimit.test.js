import { test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

// 剪贴板历史上限是运维可调的（MAX_CLIPBOARD_HISTORY），这里用非默认值验证
// 「配置 → prune → 查询」整条链路真的按这个值生效。
// 注意：limits 在模块加载时读取环境变量，因此必须先设 env 再动态 import。
let dir;
let db;
let clipboardService;
let limits;

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'trans-cap-'));
  process.env.DATA_DIR = dir;
  process.env.MAX_CLIPBOARD_HISTORY = '5';

  limits = await import('../src/config/limits');
  clipboardService = (await import('../src/services/clipboardService')).default;
  db = (await import('../src/db/database')).default;
});

afterAll(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
  delete process.env.MAX_CLIPBOARD_HISTORY;
});

test('honours the configured cap instead of the built-in default', () => {
  expect(limits.MAX_CLIPBOARD_HISTORY).toBe(5);
  expect(limits.DEFAULT_MAX_CLIPBOARD_HISTORY).toBe(50);

  for (let i = 0; i < 8; i += 1) {
    clipboardService.saveTextContent(`cap-${i}`, 'text', 'Device');
  }

  const history = clipboardService.getTextHistory();
  expect(history.total).toBe(5);
  expect(history.items.map((item) => item.content)).toEqual([
    'cap-7',
    'cap-6',
    'cap-5',
    'cap-4',
    'cap-3',
  ]);
});
