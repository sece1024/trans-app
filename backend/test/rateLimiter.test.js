import { test, expect } from 'bun:test';
import rateLimiter from '../src/middleware/rateLimiter';

function call(limiter, ip) {
  const req = { ip, socket: { remoteAddress: ip } };
  const state = { statusCode: null, passed: false };
  const res = {
    status(code) {
      state.statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };
  limiter(req, res, () => {
    state.passed = true;
  });
  return state;
}

test('allows requests up to max then blocks with 429', () => {
  const limiter = rateLimiter({ windowMs: 60_000, max: 3 });

  expect(call(limiter, '1.2.3.4').passed).toBe(true);
  expect(call(limiter, '1.2.3.4').passed).toBe(true);
  expect(call(limiter, '1.2.3.4').passed).toBe(true);

  const blocked = call(limiter, '1.2.3.4');
  expect(blocked.passed).toBe(false);
  expect(blocked.statusCode).toBe(429);
});

test('tracks IPs independently', () => {
  const limiter = rateLimiter({ windowMs: 60_000, max: 1 });

  expect(call(limiter, '10.0.0.1').passed).toBe(true);
  expect(call(limiter, '10.0.0.2').passed).toBe(true);
  expect(call(limiter, '10.0.0.1').passed).toBe(false);
});
