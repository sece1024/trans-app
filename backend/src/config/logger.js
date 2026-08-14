function ts() {
  return new Date().toISOString();
}

const logger = {
  info: (...args) => console.info(`[${ts()}]`, ...args),
  warn: (...args) => console.warn(`[${ts()}]`, ...args),
  error: (...args) => console.error(`[${ts()}]`, ...args),
};

module.exports = logger;
