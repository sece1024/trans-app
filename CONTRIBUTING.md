# Contributing

## 环境要求

- **Bun**（后端运行时 + 打包工具，[安装指南](https://bun.sh)）
- **Node.js >= 18**（前端 CRA 构建需要）
- **pnpm**（项目统一使用 pnpm，不使用 npm / yarn / npx）

## 安装依赖

```bash
pnpm install && cd frontend && pnpm install && cd ../backend && pnpm install
```

## 开发

```bash
# 同时启动前后端（推荐）
pnpm start

# 仅启动后端（端口 5001，bun --watch 热重载）
cd backend && pnpm run dev

# 仅启动前端（端口 3000，CRA dev server，自动代理 /api → 5001）
cd frontend && pnpm start
```

## 代码风格

后端使用 Prettier 格式化（`backend/.prettierrc`）：

```bash
cd backend && pnpm run style:check   # 检查
cd backend && pnpm run style:format  # 自动修复
```

配置：单引号、2 空格缩进、100 字符行宽、尾逗号 es5、分号。

前端使用 CRA 默认 ESLint 配置，无额外格式化工具。

## 架构概览

### 请求流程

```
浏览器 → Express (5001)
           ├── /api/*        → 路由层 → 服务层 → SQLite / 文件系统
           └── 其他路径       → 静态文件 / SPA fallback
```

开发模式下前端 CRA dev server (3000) 将 `/api` 代理到 5001。

### 后端分层

| 层 | 目录 | 职责 |
|---|---|---|
| 路由 | `src/routes/` | 参数校验、调用服务、返回响应 |
| 服务 | `src/services/` | 业务逻辑（BaseService 提供文件操作公共方法） |
| 数据 | `src/db/` | `database.js` 初始化连接，`ContentItem.js` 封装 prepared statements |
| 中间件 | `src/middleware/` | 错误处理、文件名消毒 |
| 配置 | `src/config/` | multer 存储工厂、logger |
| 工具 | `src/utils/` | `isSea()` 编译二进制检测、网络信息 |

### 前端分层

| 层 | 目录 | 职责 |
|---|---|---|
| 页面 | `src/pages/` | 路由级组件（FileUpload、ImageUpload、SharedClipboard） |
| 组件 | `src/components/` | 可复用 UI（UploadZone、Toast、ThemePicker、EmptyState…） |
| API | `src/api/client.js` | 统一 fetch 封装，所有请求经过 `request()` |
| Context | `src/context/` | ToastProvider（`useToast` hook） |
| 工具 | `src/utils/` | 动画变体、剪贴板复制、上传辅助函数 |

### CSS 架构

单文件 `App.css`，使用 `@layer` 分层：

```
tokens → reset → layout → components → utilities
```

颜色系统基于 OKLCH，通过 `[data-theme]` 属性切换 5 种主题（light / dark / forest / sunset / ocean）。主题只需覆盖原始值（`--lch-primary` 等），语义 token 自动生效。

## 关键约定

### 文件名编码

Multer 将文件名按 `latin1` 接收。上传响应中返回原始文件名时必须解码：

```js
const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
```

存储时 `config/multer.js` 已自动解码并添加时间戳前缀。

### 编译二进制检测

使用 `utils/sea.js` 导出的 `isSea()` 函数（检查 `path.basename(process.execPath)` 是否为 `bun` 或 `node`），编译后的二进制名为 `trans`，因此返回 `true`。

### 文件名安全

路由中使用文件名参数时，必须应用 `sanitizeFilename('paramName')` 中间件防止路径穿越。

### 数据库

`ContentItem`（`src/db/ContentItem.js`）使用 `bun:sqlite` 的 prepared statements，不使用 ORM。表名 `Contents`，方法：`create()`、`findAll()`、`destroy(id)`。`destroy()` 通过 `SELECT changes()` 获取受影响行数（`bun:sqlite` 的 `stmt.run()` 返回 `undefined`）。

### 错误处理

- 路由层统一 try/catch，错误通过 `errorHandler` 中间件返回
- 捕获的错误应记录日志（`logger.error`），不要静默吞掉
- 使用 `throw new Error('msg', { cause: error })` 保留原始堆栈

### API 客户端

前端所有 HTTP 请求通过 `src/api/client.js` 的 `api` 对象发出。下载文件使用 `uploadHelpers.js` 的 `downloadFile()`，不要直接 `fetch`。

## 添加新功能的流程

### 新增后端 API

1. 在 `src/routes/` 中添加路由，挂载到 `index.js` 的 `/api` 下
2. 业务逻辑写在 `src/services/` 中
3. 需要数据库操作时在 `ContentItem.js` 中添加方法（使用 prepared statements）
4. 涉及文件名参数时加 `sanitizeFilename` 中间件
5. 运行 `pnpm run style:format` 格式化

### 新增前端页面

1. 在 `src/pages/` 创建页面组件
2. 在 `App.js` 添加 `<Route>`
3. API 调用通过 `src/api/client.js`，需要新方法时在 `api` 对象中添加
4. 文件下载/链接复制使用 `src/utils/uploadHelpers.js`

## 常见问题

### 端口被占用

后端默认 5001，前端默认 3000。修改后端端口需同步更新：

1. `backend/.env` 中的 `PORT`
2. `frontend/package.json` 中的 `"proxy"` 值

### 中文文件名乱码

确保上传响应中使用了 `Buffer.from(originalname, 'latin1').toString('utf8')` 解码。

## 测试

目前无自动化测试。`cd backend && pnpm test` 是占位脚本（直接 exit 1）。

`backend/test/` 目录下的文件是手动调试工具，不是测试套件。

## 相关文档

- [AGENTS.md](./AGENTS.md) — AI 辅助开发指引
- [doc/](./doc/) — 架构分析与重构记录
- [.github/copilot-instructions.md](./.github/copilot-instructions.md) — 详细架构说明
