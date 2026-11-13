import { test, expect } from 'bun:test';
import * as frontendLimits from '../../frontend/src/utils/uploadLimits';
import backendLimits from '../src/config/limits';

// 前端 uploadLimits.js 是后端 config/limits.js 的镜像，两侧改一忘一会造成
// 「前端本地校验放行、后端拒绝」（或反之）的漂移——此测试保证两侧永远一致。
//
// 剪贴板历史上限可由 MAX_CLIPBOARD_HISTORY 环境变量覆盖，因此比较的是「默认值」；
// 前端真正生效的值来自 /api/server-info（见 frontend/src/pages/SharedClipboard.js）。
test('frontend uploadLimits mirrors backend config/limits', () => {
  expect(frontendLimits.MAX_FILE_SIZE).toBe(backendLimits.MAX_FILE_SIZE);
  expect(frontendLimits.MAX_IMAGE_SIZE).toBe(backendLimits.MAX_IMAGE_SIZE);
  expect(frontendLimits.MAX_CLIPBOARD_LENGTH).toBe(backendLimits.MAX_CLIPBOARD_LENGTH);
  expect(frontendLimits.DEFAULT_MAX_CLIPBOARD_HISTORY).toBe(
    backendLimits.DEFAULT_MAX_CLIPBOARD_HISTORY
  );
  expect(frontendLimits.MAX_CATEGORY_LENGTH).toBe(backendLimits.MAX_CATEGORY_LENGTH);
});

test('clipboard history cap settles on a positive integer', () => {
  expect(Number.isInteger(backendLimits.MAX_CLIPBOARD_HISTORY)).toBe(true);
  expect(backendLimits.MAX_CLIPBOARD_HISTORY).toBeGreaterThan(0);
  // 未设置环境变量时等于默认值（测试进程不注入 MAX_CLIPBOARD_HISTORY）
  expect(backendLimits.MAX_CLIPBOARD_HISTORY).toBe(backendLimits.DEFAULT_MAX_CLIPBOARD_HISTORY);
});
