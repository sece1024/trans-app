const logger = require('../config/logger');

/**
 * 从环境变量读取一个正整数，越界/非法时回退默认值并告警一次。
 *
 * 环境变量是运维入口（systemd unit、docker、手工导出），拼错或写成 "50 条"
 * 这类值不应该让服务起不来，也不应该静默变成 NaN 让业务逻辑崩掉。
 *
 * @param {Object} options
 * @param {string} options.name     环境变量名（用于日志）
 * @param {unknown} options.raw     `process.env[name]` 原始值
 * @param {number} options.fallback 缺省值
 * @param {number} [options.min=1]  允许的最小值（含）
 * @param {number} [options.max]    允许的最大值（含），缺省不设上限
 * @returns {number}
 */
function readPositiveInt({ name, raw, fallback, min = 1, max = Number.MAX_SAFE_INTEGER }) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;

  const value = Number(String(raw).trim());
  if (!Number.isInteger(value) || value < min || value > max) {
    logger.warn(`[config]: ignoring invalid ${name}=${raw}, using ${fallback}`);
    return fallback;
  }
  return value;
}

module.exports = readPositiveInt;
