# Trans App 重构改造计划

> 基于项目评估的改造方案，按优先级分阶段执行。

## 阶段一：后端基础加固（高优先级）

### 1.1 安全加固
- [x] 文件路径 sanitize：对 `req.params.fileName` 做路径遍历校验（防止 `../../etc/passwd`）
- [x] CORS 限制：从全开改为仅允许局域网来源
- [x] 错误信息脱敏：不向客户端暴露内部错误堆栈

### 1.2 错误处理统一
- [x] 统一错误响应格式 `{ error: string, code?: string }`
- [x] 所有路由使用 try/catch + next(err) 模式
- [x] 完善全局错误中间件，区分 4xx 和 5xx

### 1.3 Service 层实化
- [x] 抽取文件操作到 `fileService.js`（上传/列表/下载/删除）
- [x] 抽取图片操作到 `imageService.js`
- [x] Route handler 精简为：参数校验 → 调用 service → 格式化响应

## 阶段二：前端架构优化（高优先级）

### 2.1 API 抽象层
- [x] 创建 `src/api/client.js` 统一封装 fetch（baseURL、错误拦截、JSON 解析）
- [x] 各页面的 fetch 调用迁移到 api 层

### 2.2 共享组件提取
- [x] 提取 `UploadZone` 组件（拖拽上传区域）
- [x] 提取 `animations.js` 共享动画常量
- [x] 各页面使用共享组件重构

## 阶段三：可访问性与体验（中优先级）

### 3.1 可访问性修复
- [x] 添加全局 `focus-visible` 样式
- [x] `ServerInfo` 中可点击 div 改为 button，添加键盘支持
- [x] 确保所有交互元素有 ARIA 标签

## 阶段四：代码清理（低优先级）

### 4.1 清理残留代码
- [x] 移除 `utils/tool.js` 调试代码
- [x] 清理未使用的 import
- [x] 修复 systemRoutes 默认端口 3000 → 5001

---

## 执行策略

- 每完成一项（或一组紧密相关的子项）提交一个 commit
- commit message 格式：`refactor(scope): description`
- 改动后验证服务可正常启动
