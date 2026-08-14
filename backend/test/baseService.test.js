import { test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import BaseService from '../src/services/baseService';

let dir;
let service;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'trans-base-'));
  service = new BaseService(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

test('getOriginalName strips timestamp prefix', () => {
  expect(service.getOriginalName('1750000000000-report.pdf')).toBe('report.pdf');
  expect(service.getOriginalName('noprefix.txt')).toBe('noprefix.txt');
});

test('getTimestamp parses prefix or falls back to 0', () => {
  expect(service.getTimestamp('1750000000000-x')).toBe(1750000000000);
  expect(service.getTimestamp('no-prefix')).toBe(0);
});

test('sortByTimeDesc sorts newest first', () => {
  expect(service.sortByTimeDesc(['1-a', '3-c', '2-b'])).toEqual(['3-c', '2-b', '1-a']);
});

test('delete removes an existing file', async () => {
  writeFileSync(path.join(dir, 'f.txt'), 'x');
  expect(await service.delete('f.txt')).toBe(true);
  expect(service.exists('f.txt')).toBe(false);
});

test('delete returns false for a missing file', async () => {
  expect(await service.delete('missing.txt')).toBe(false);
});
