const logger = require('../config/logger');

// 简单的固定窗口按 IP 限流，保护写接口免受局域网内滥用。
// 仅内存计数，进程重启即重置，符合局域网工具的定位。
function rateLimiter({ windowMs = 60_000, max = 60, message = 'Too many requests' } = {}) {
  const hits = new Map();

  // 定期清理过期条目，避免 Map 无限增长
  const cleaner = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (now > entry.resetAt) hits.delete(ip);
    }
  }, windowMs);
  if (cleaner.unref) cleaner.unref();

  return function rateLimit(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = hits.get(ip);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      logger.warn(`rate limit exceeded for ${ip}`);
      return res.status(429).json({ message });
    }
    next();
  };
}

module.exports = rateLimiter;
