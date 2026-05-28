const path = require('path');

// Detect whether running as a compiled Bun binary (production)
// vs running via `bun src/index.js` or `node src/index.js` (development)
function isCompiled() {
  const execName = path.basename(process.execPath);
  return execName !== 'node' && execName !== 'bun';
}

module.exports = { isCompiled };
