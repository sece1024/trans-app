import { test, expect } from 'bun:test';
import * as frontendLimits from '../../frontend/src/utils/uploadLimits';
import backendLimits from '../src/config/limits';

// 前端 uploadLimits.js 是后端 config/limits.js 的镜像，两侧改一忘一会造成
// 「前端本地校验放行、后端拒绝」（或反之）的漂移——此测试保证两侧永远一致。
test('frontend uploadLimits mirrors backend config/limits', () => {
  expect(frontendLimits.MAX_FILE_SIZE).toBe(backendLimits.MAX_FILE_SIZE);
  expect(frontendLimits.MAX_IMAGE_SIZE).toBe(backendLimits.MAX_IMAGE_SIZE);
  expect(frontendLimits.MAX_CLIPBOARD_LENGTH).toBe(backendLimits.MAX_CLIPBOARD_LENGTH);
  expect(frontendLimits.MAX_CLIPBOARD_HISTORY).toBe(backendLimits.MAX_CLIPBOARD_HISTORY);
});
