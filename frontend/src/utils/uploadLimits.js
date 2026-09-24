// 上传/剪贴板上限统一在此定义，禁止在各页面/组件中散落魔数。
// 本文件是后端权威值 backend/src/config/limits.js 的前端镜像，
// 漂移由 backend/test/limits.test.js 自动校验（改任一侧测试即红）。

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB，文件上传上限
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB，图片上传上限
export const MAX_CLIPBOARD_LENGTH = 10000; // 单条剪贴板字符数上限
export const MAX_CLIPBOARD_HISTORY = 50; // 剪贴板历史保留条数
