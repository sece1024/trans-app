// 上传/剪贴板上限统一在此定义，禁止在各页面/组件中散落魔数。
// 数值必须与后端保持一致（backend/src/config/multer.js、routes/clipboardRoutes.js）。

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB，与 multer fileUpload 一致
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB，与 multer imageUpload 一致
export const MAX_CLIPBOARD_LENGTH = 10000; // 单条剪贴板字符数上限