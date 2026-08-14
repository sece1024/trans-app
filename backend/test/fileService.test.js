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
    const list = await service.list();

    expect(list.map((f) => f.name)).toEqual(['200-b.txt', '100-a.txt']);
    expect(list[0].originalName).toBe('b.txt');
    expect(list[0].size).toBe(11);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('list without includeSize omits size field', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'trans-file-'));
  try {
    writeFileSync(path.join(dir, '1-a.txt'), 'x');
    const service = new FileService(dir);
    const list = await service.list();
    expect(list[0].size).toBeUndefined();
    expect(list[0].name).toBe('1-a.txt');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('list returns empty array when dir is missing', async () => {
  const service = new FileService(path.join(tmpdir(), 'trans-nonexistent-xyz'));
  expect(await service.list()).toEqual([]);
});
