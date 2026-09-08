import { test, expect } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import requireDiskSpace from '../src/middleware/requireDiskSpace';

function run(middleware) {
  const req = {};
  const state = { status: null, message: null, next: false };
  const res = {
    status(code) {
      state.status = code;
      return this;
    },
    json(body) {
      state.message = body.message;
      return this;
    },
  };
  middleware(req, res, () => {
    state.next = true;
  });
  return state;
}

test('allows upload when free space is above threshold', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'trans-space-'));
  const middleware = requireDiskSpace(dir, 1);
  expect(run(middleware).next).toBe(true);
  rmSync(dir, { recursive: true, force: true });
});

test('returns 507 when free space is below threshold', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'trans-space-'));
  const middleware = requireDiskSpace(dir, Number.MAX_SAFE_INTEGER);
  const state = run(middleware);
  expect(state.next).toBe(false);
  expect(state.status).toBe(507);
  expect(state.message).toContain('存储空间不足');
  rmSync(dir, { recursive: true, force: true });
});
