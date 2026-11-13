// 前后端共享限额的权威来源（唯一真源）。
// 前端镜像：frontend/src/utils/uploadLimits.js，
// 漂移由 backend/test/limits.test.js 自动校验。
// 后端独有且与校验逻辑强耦合的限额（deviceInfo、分页、SSE）留在各自模块。
const readPositiveInt = require('../utils/envInt');

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB，文件上传上限
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB，图片上传上限
const MAX_CLIPBOARD_LENGTH = 10000; // 单条剪贴板字符数上限
const MAX_CATEGORY_LENGTH = 32; // 单个剪贴板分类名长度上限

// 剪贴板历史保留条数：默认 50，可用 MAX_CLIPBOARD_HISTORY 环境变量覆盖
// （与 DATA_DIR 同级的运维配置，见 README「环境变量」）。
// 上限 1000 是防御性夹取：这个值决定 SQLite 表的增长速度，部署在树莓派 SD 卡上时
// 填错一个数量级就会把磁盘写满。
const DEFAULT_MAX_CLIPBOARD_HISTORY = 50;
const MAX_CLIPBOARD_HISTORY = readPositiveInt({
  name: 'MAX_CLIPBOARD_HISTORY',
  raw: process.env.MAX_CLIPBOARD_HISTORY,
  fallback: DEFAULT_MAX_CLIPBOARD_HISTORY,
  min: 1,
  max: 1000,
});

module.exports = {
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  MAX_CLIPBOARD_LENGTH,
  MAX_CATEGORY_LENGTH,
  DEFAULT_MAX_CLIPBOARD_HISTORY,
  MAX_CLIPBOARD_HISTORY,
};
