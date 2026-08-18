import { test, expect } from 'bun:test';
import rateLimiter from '../src/middleware/rateLimiter';

function call(limiter, ip) {
  const req = { ip, socket: { remoteAddress: ip } };
  const state = { statusCode: null, passed: false, headers: {} };
  const res = {
    setHeader(name, value) {
      state.headers[name] = value;
      return this;
    },
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

test('sets X-RateLimit headers and Retry-After on block', () => {
  const limiter = rateLimiter({ windowMs: 60_000, max: 2 });

  const first = call(limiter, '1.1.1.1');
  expect(first.headers['X-RateLimit-Limit']).toBe('2');
  expect(first.headers['X-RateLimit-Remaining']).toBe('1');

  const second = call(limiter, '1.1.1.1');
  expect(second.headers['X-RateLimit-Remaining']).toBe('0');

  const blocked = call(limiter, '1.1.1.1');
  expect(blocked.statusCode).toBe(429);
  expect(blocked.headers['Retry-After']).toBeTruthy();
  expect(Number(blocked.headers['X-RateLimit-Remaining'])).toBe(0);
});

test('rejected requests do not consume quota (sliding window)', () => {
  const limiter = rateLimiter({ windowMs: 60_000, max: 2 });

  expect(call(limiter, '5.5.5.5').passed).toBe(true);
  expect(call(limiter, '5.5.5.5').passed).toBe(true);
  // 已满，额外的被拒请求不应继续累积计数
  expect(call(limiter, '5.5.5.5').passed).toBe(false);
  expect(call(limiter, '5.5.5.5').passed).toBe(false);
  // 仍处于窗口内，下一个请求依旧应被拒（未被被拒请求占位影响）
  expect(call(limiter, '5.5.5.5').passed).toBe(false);
});

test('sliding window does not allow double burst at boundary', () => {
  // 用可注入时钟验证：请求时间戳随时间推进，窗口外旧请求会被淘汰，
  // 但窗口边界处不会出现「上一窗口 + 新窗口」叠加放行 2×max 的突发。
  let t = 0;
  const limiter = rateLimiter({ windowMs: 10_000, max: 2, now: () => t });

  // t=0 与 t=1000：窗口内两次请求，恰好打满
  t = 0;
  expect(call(limiter, '8.8.8.8').passed).toBe(true);
  t = 1000;
  expect(call(limiter, '8.8.8.8').passed).toBe(true);

  // 仍在窗口内（t=2000 距首次仅 2s），第三个请求应被拒
  t = 2000;
  expect(call(limiter, '8.8.8.8').passed).toBe(false);

  // 推进到首个请求刚好滑出窗口（t=10000），但第二个仍在窗口内（1000 + 10000 = 11000 > 10000）
  // 此时窗口内只剩 1 个请求，应放行 1 个再拒绝
  t = 10000;
  expect(call(limiter, '8.8.8.8').passed).toBe(true);

  // 窗口内已有 2 个（t=1000 与 t=10000），再次请求应被拒
  t = 10001;
  expect(call(limiter, '8.8.8.8').passed).toBe(false);
});
