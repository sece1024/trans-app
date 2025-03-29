const logger = {
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
  test: (name, message) => console.warn(`[TEST ${name}]: `, message),
};

module.exports = logger;
