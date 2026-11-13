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
  expect(history.items.some((c) => c.id === item.id)).toBe(true);
});

test('prunes history beyond the last 50 entries', () => {
  for (let i = 0; i < 60; i += 1) {
    clipboardService.saveTextContent(`content-${i}`, 'text', 'Device');
  }
  const history = clipboardService.getTextHistory();
  expect(history.items.length).toBeLessThanOrEqual(50);
});

test('paginates history with cursor without duplicates', () => {
  const page1 = clipboardService.getTextHistory({ limit: 2 });
  expect(page1.items.length).toBe(2);
  expect(page1.nextCursor).not.toBeNull();

  const page2 = clipboardService.getTextHistory({ limit: 2, cursor: page1.nextCursor });
  expect(page2.items.length).toBe(2);

  const ids = [...page1.items, ...page2.items].map((c) => c.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('delete removes an entry and reports affected count', () => {
  const item = clipboardService.saveTextContent('temp', 'text', 'Device');
  expect(clipboardService.delete(item.id)).toBe(1);
  expect(clipboardService.delete(item.id)).toBe(0);
});

test('returns an empty page for a non-numeric cursor', () => {
  const page = clipboardService.getTextHistory({ limit: 2, cursor: 'garbage' });
  expect(page.items).toEqual([]);
  expect(page.hasMore).toBe(false);
  expect(page.nextCursor).toBeNull();
  expect(page.total).toBeGreaterThan(0);
});

test('saves, filters and updates categories', () => {
  const torrentItem = clipboardService.saveTextContent('magnet:?xt=1', 'text', 'Device', 'torrent');
  const linkItem = clipboardService.saveTextContent(
    'https://example.com',
    'text',
    'Device',
    'Link'
  );
  const plainItem = clipboardService.saveTextContent('plain text', 'text', 'Device');
  expect(torrentItem.category).toBe('torrent');
  expect(plainItem.category).toBeNull();

  // 指定分类筛选
  const torrentPage = clipboardService.getTextHistory({ category: 'torrent' });
  expect(torrentPage.items.some((item) => item.id === torrentItem.id)).toBe(true);
  expect(torrentPage.items.every((item) => item.category === 'torrent')).toBe(true);

  // category = null 表示只查未分类
  const uncategorized = clipboardService.getTextHistory({ category: null });
  expect(uncategorized.items.some((item) => item.id === plainItem.id)).toBe(true);
  expect(uncategorized.items.every((item) => item.category === null)).toBe(true);

  // 改分类：改走后不再出现在原分类，清空后进入未分类
  expect(clipboardService.updateCategory(linkItem.id, 'torrent')).toBe(1);
  expect(
    clipboardService.getTextHistory({ category: 'Link' }).items.some((c) => c.id === linkItem.id)
  ).toBe(false);

  expect(clipboardService.updateCategory(linkItem.id, null)).toBe(1);
  expect(
    clipboardService.getTextHistory({ category: null }).items.some((c) => c.id === linkItem.id)
  ).toBe(true);

  // 不存在的 id 影响行数为 0
  expect(clipboardService.updateCategory('missing-id', 'torrent')).toBe(0);
});

test('category summary reports counts and global total', () => {
  const summary = clipboardService.getCategorySummary();
  const torrent = summary.categories.find((c) => c.name === 'torrent');
  expect(torrent).toBeTruthy();
  expect(torrent.count).toBeGreaterThanOrEqual(1);

  const categorizedTotal = summary.categories.reduce((sum, c) => sum + c.count, 0);
  expect(summary.total).toBe(categorizedTotal + summary.uncategorized);
});

test('renameCategory merges into the target and reports affected rows', () => {
  const a = clipboardService.saveTextContent('a', 'text', 'Device', 'merge-from');
  const b = clipboardService.saveTextContent('b', 'text', 'Device', 'merge-from');
  clipboardService.saveTextContent('c', 'text', 'Device', 'merge-to');

  expect(clipboardService.renameCategory('merge-from', 'merge-to')).toBe(2);

  const merged = clipboardService.getTextHistory({ category: 'merge-to' });
  const ids = merged.items.map((item) => item.id);
  expect(ids).toEqual(expect.arrayContaining([a.id, b.id]));
  expect(clipboardService.getTextHistory({ category: 'merge-from' }).items).toHaveLength(0);
});

test('renameCategory returns 0 for a category that does not exist', () => {
  expect(clipboardService.renameCategory('nope', 'target')).toBe(0);
});

test('clearCategory moves entries to uncategorized instead of deleting them', () => {
  const item = clipboardService.saveTextContent('clear', 'text', 'Device', 'clear-svc');

  expect(clipboardService.clearCategory('clear-svc')).toBe(1);

  const uncategorized = clipboardService.getTextHistory({ category: null });
  expect(uncategorized.items.find((row) => row.id === item.id)).toBeTruthy();
  expect(clipboardService.getTextHistory({ category: 'clear-svc' }).items).toHaveLength(0);
  expect(clipboardService.clearCategory('clear-svc')).toBe(0);
});

test('category identity ignores case so Link / link never fork into two categories', () => {
  const upper = clipboardService.saveTextContent('upper', 'text', 'Device', 'Link');
  const lower = clipboardService.saveTextContent('lower', 'text', 'Device', 'link');

  // 写入口把新名字收敛到已有写法：显示名保持第一次出现的 Link
  expect(lower.category).toBe('Link');

  // 两个拼写都能查到同一批条目
  const byUpper = clipboardService.getTextHistory({ category: 'Link' });
  const byLower = clipboardService.getTextHistory({ category: 'link' });
  const ids = byUpper.items.map((item) => item.id);
  expect(ids).toEqual(expect.arrayContaining([upper.id, lower.id]));
  expect(byLower.total).toBe(byUpper.total);

  // 汇总里只有一个 Link，而不是 Link + link
  const summary = clipboardService.getCategorySummary();
  const linkChips = summary.categories.filter((c) => c.name.toLowerCase() === 'link');
  expect(linkChips).toHaveLength(1);
  expect(linkChips[0].count).toBe(byUpper.total);
});

test('renaming only the case of a category updates the display spelling', () => {
  clipboardService.saveTextContent('c1', 'text', 'Device', 'spell');
  clipboardService.saveTextContent('c2', 'text', 'Device', 'spell');

  expect(clipboardService.renameCategory('spell', 'Spell')).toBe(2);

  const summary = clipboardService.getCategorySummary();
  expect(summary.categories.find((c) => c.name === 'Spell')?.count).toBe(2);
  expect(summary.categories.some((c) => c.name === 'spell')).toBe(false);
});

test('merging into an existing category adopts that category spelling', () => {
  clipboardService.saveTextContent('t1', 'text', 'Device', 'Target');
  clipboardService.saveTextContent('t2', 'text', 'Device', 'other-one');

  // 目标已存在（大小写不同也算存在）→ 合并，并沿用 Target 的写法
  expect(clipboardService.renameCategory('other-one', 'target')).toBe(1);

  const items = clipboardService.getTextHistory({ category: 'Target' });
  expect(items.items.every((item) => item.category === 'Target')).toBe(true);
  expect(items.total).toBe(2);
});
