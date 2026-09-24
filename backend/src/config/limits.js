// 前后端共享限额的权威来源（唯一真源）。
// 前端镜像：frontend/src/utils/uploadLimits.js，
// 漂移由 backend/test/limits.test.js 自动校验。
// 后端独有且与校验逻辑强耦合的限额（deviceInfo、分页、SSE）留在各自模块。
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB，文件上传上限
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB，图片上传上限
const MAX_CLIPBOARD_LENGTH = 10000; // 单条剪贴板字符数上限
const MAX_CLIPBOARD_HISTORY = 50; // 剪贴板历史保留条数

module.exports = { MAX_FILE_SIZE, MAX_IMAGE_SIZE, MAX_CLIPBOARD_LENGTH, MAX_CLIPBOARD_HISTORY };
