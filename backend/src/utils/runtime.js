const path = require('path');
const fs = require('fs');

// 判断是否运行在 Bun 编译后的二进制中（生产模式）。
// 编译产物由 bun build --compile 生成，其可执行文件旁的 public/ 目录存放前端静态资源；
// 开发模式（bun src/index.js）则无该目录。
function isCompiled() {
  // process.isBun 在 Bun 的开发模式（bun src/index.js）和编译二进制中都为 true，
  // 而 Bun.isBun 在 Bun 1.3.x 中始终为 undefined，不能用于识别运行时。
  if (!process.isBun) return false;
  const publicDir = path.join(path.dirname(process.execPath), 'public');
  return fs.existsSync(publicDir);
}

module.exports = { isCompiled };
