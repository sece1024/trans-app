const logger = require('../config/logger');

/**
 * 按 IP 的滑动窗口限流，保护写接口免受局域网内滥用。
 * 仅内存计数，进程重启即重置，符合局域网工具的定位。
 *
 * 相比固定窗口：滑动窗口用「最近 windowMs 内的请求时间戳」判定，
 * 消除固定窗口在边界处可突发 2×max 请求的抖动问题。
 *
 * 响应头：
 *  - X-RateLimit-Limit      窗口内允许的最大请求数
 *  - X-RateLimit-Remaining  本次请求后剩余的配额
 *  - Retry-After（仅 429）   建议客户端等待的秒数
 */
function rateLimiter({
  windowMs = 60_000,
  max = 60,
  message = 'Too many requests',
  now = Date.now,
} = {}) {
  // ip -> 升序的请求时间戳数组（仅含窗口内的请求）
  const hits = new Map();

  // 兜底定期清理过期条目，避免 Map 无限增长（惰性清理已覆盖常态）
  const cleaner = setInterval(() => {
    const cutoff = now() - windowMs;
    for (const [ip, timestamps] of hits) {
      const kept = trim(timestamps, cutoff);
      if (kept.length === 0) hits.delete(ip);
      else hits.set(ip, kept);
    }
  }, windowMs);
  if (cleaner.unref) cleaner.unref();

  // 移除数组头部所有 <= cutoff 的过期时间戳（数组升序，故从头部截断）
  function trim(timestamps, cutoff) {
    let i = 0;
    while (i < timestamps.length && timestamps[i] <= cutoff) i += 1;
    return i > 0 ? timestamps.slice(i) : timestamps;
  }

  return function rateLimit(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const nowMs = now();
    const cutoff = nowMs - windowMs;

    // 惰性清理：读取前丢弃窗口外的旧时间戳
    let timestamps = hits.get(ip);
    if (timestamps) {
      timestamps = trim(timestamps, cutoff);
      if (timestamps.length === 0) hits.delete(ip);
      else hits.set(ip, timestamps);
    } else {
      timestamps = [];
    }

    const used = timestamps.length;

    if (used >= max) {
      // 最早一次窗口内请求过期后即可恢复
      const retryAfterSec = Math.max(1, Math.ceil((timestamps[0] + windowMs - nowMs) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', '0');
      logger.warn(`rate limit exceeded for ${ip}`);
      return res.status(429).json({ message });
    }

    // 仅统计被放行的请求；被拒绝的请求不占用配额
    timestamps.push(nowMs);
    hits.set(ip, timestamps);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(max - used - 1));
    next();
  };
}

module.exports = rateLimiter;
