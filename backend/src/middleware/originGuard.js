const logger = require('../config/logger');

// 与 CORS 共用的来源白名单：localhost/127.x + 局域网私有地址
const ALLOWED_ORIGIN = /^https?:\/\/(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// 判断请求来源是否可接受：无 Origin（curl / 同源非浏览器）或命中白名单
function isAllowedOrigin(origin) {
  if (!origin) return true;
  return ALLOWED_ORIGIN.test(origin);
}

// 写接口 Origin 校验：cors 中间件只控制是否下发响应头，不拦截请求本身，
// 跨站 HTML 表单（multipart 不经预检）可直接向写接口发请求（CSRF）。
// 这里对写方法显式拦截「带 Origin 且不在白名单、也不同源」的请求。
function originGuard(req, res, next) {
  if (!WRITE_METHODS.includes(req.method)) return next();

  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) return next();

  // 同源请求（如通过 .local 主机名访问）按 Host 比对放行
  try {
    if (new URL(origin).host === req.headers.host) return next();
  } catch {
    // Origin 非法 URL → 落入 403
  }

  logger.warn(`blocked cross-origin ${req.method} ${req.path} from ${origin}`);
  return res.status(403).json({ message: 'Cross-origin write requests are not allowed' });
}

module.exports = originGuard;
module.exports.isAllowedOrigin = isAllowedOrigin;
