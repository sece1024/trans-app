import { test, expect } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import FileService from '../src/services/fileService';

test('list returns name/originalName/size sorted newest first', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'trans-file-'));
  try {
    writeFileSync(path.join(dir, '100-a.txt'), 'hello');
    writeFileSync(path.join(dir, '200-b.txt'), 'hello world');

    const service = new FileService(dir, { includeSize: true });
    const result = await service.list();

    expect(result.items.map((f) => f.name)).toEqual(['200-b.txt', '100-a.txt']);
    expect(result.total).toBe(2);
    expect(result.hasMore).toBe(false);
    expect(result.items[0].originalName).toBe('b.txt');
    expect(result.items[0].size).toBe(11);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('list without includeSize omits size field', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'trans-file-'));
  try {
    writeFileSync(path.join(dir, '1-a.txt'), 'x');
    const service = new FileService(dir);
    const result = await service.list();
    expect(result.items[0].size).toBeUndefined();
    expect(result.items[0].name).toBe('1-a.txt');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('list paginates with cursor', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'trans-file-'));
  try {
    writeFileSync(path.join(dir, '1-a.txt'), 'x');
    writeFileSync(path.join(dir, '2-b.txt'), 'x');
    writeFileSync(path.join(dir, '3-c.txt'), 'x');

    const service = new FileService(dir);
    const page1 = await service.list({ limit: 2 });
    expect(page1.items.map((f) => f.name)).toEqual(['3-c.txt', '2-b.txt']);
    expect(page1.total).toBe(3);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBe('2-b.txt');

    const page2 = await service.list({ limit: 2, cursor: page1.nextCursor });
    expect(page2.items.map((f) => f.name)).toEqual(['1-a.txt']);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBe('1-a.txt');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('list returns empty result when dir is missing', async () => {
  const service = new FileService(path.join(tmpdir(), 'trans-nonexistent-xyz'));
  const result = await service.list();
  expect(result.items).toEqual([]);
  expect(result.total).toBe(0);
  expect(result.hasMore).toBe(false);
});
