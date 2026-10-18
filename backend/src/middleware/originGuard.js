const logger = require('../config/logger');

// 与 CORS 共用的来源白名单：localhost + 回环地址 + 局域网私有 IPv4。
// 必须按 hostname 精确判断：前缀正则会把 localhost.evil.com / 192.168.evil.com
// 这类攻击者域名误判为局域网来源（CORS 与写接口 CSRF 防护会同时失效）。
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

// 是否为 127.0.0.0/8、10.0.0.0/8、172.16.0.0/12、192.168.0.0/16 中的地址
function isPrivateIPv4(hostname) {
  const match = IPV4_RE.exec(hostname);
  if (!match) return false;

  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return false;

  const [first, second] = octets;
  return (
    first === 127 ||
    first === 10 ||
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31)
  );
}

// 判断请求来源是否可接受：无 Origin（curl / 同源非浏览器）或命中白名单
function isAllowedOrigin(origin) {
  if (!origin) return true;

  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const { hostname } = url;
  if (hostname === 'localhost' || hostname === '[::1]') return true;
  return isPrivateIPv4(hostname);
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
