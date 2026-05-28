function isSea() {
  try {
    return require('node:sea').isSea();
  } catch {
    return false;
  }
}

module.exports = { isSea };
