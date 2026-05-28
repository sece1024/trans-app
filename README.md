# Trans App

一个用于在局域网内共享文本、图片和文件的应用程序。

## 功能特性

- 📁 **文件共享**：上传、下载、删除文件
- 🖼️ **图片共享**：上传、查看、下载、删除图片
- 📋 **剪贴板同步**：在不同设备间同步文本内容
- 🌐 **局域网访问**：支持局域网内多设备访问
- 🎨 **多主题切换**：支持亮色、暗色、森林、日落、海洋五种主题

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19、React Router 7、Framer Motion |
| 后端 | Express.js、Multer、bun:sqlite |
| 打包 | Bun compile（内置交叉编译） |

## 项目结构

```
trans-app/
├── frontend/                  # React 前端
│   └── src/
│       ├── api/client.js      # 统一 fetch 封装
│       ├── pages/             # 页面组件（FileUpload、ImageUpload、SharedClipboard）
│       ├── components/        # 通用组件（UploadZone、Toast、ThemePicker…）
│       ├── context/           # ToastContext
│       └── utils/             # 动画、剪贴板、上传辅助函数
├── backend/                   # Express 后端
│   └── src/
│       ├── index.js           # 入口，注册路由与中间件
│       ├── routes/            # 路由层（file、image、clipboard、system）
│       ├── services/          # 业务逻辑（BaseService → FileService / ImageService）
│       ├── db/                # bun:sqlite 实例 + ContentItem 模型
│       ├── middleware/        # errorHandler、sanitizeFilename
│       ├── config/            # multer 存储、logger
│       └── utils/             # 编译模式检测（runtime.js）、网络信息
├── request/                   # REST Client 测试文件
├── AGENTS.md                  # AI 辅助开发指引
└── package.json               # 根配置，concurrently 启动前后端
```

## 环境要求

- **Bun**（后端运行时 + 打包工具，[安装指南](https://bun.sh)）
- **Node.js >= 18**（前端 CRA 构建）
- **pnpm**（不使用 npm / yarn）

## 快速开始

```bash
# 安装依赖
pnpm install && cd frontend && pnpm install && cd ../backend && pnpm install

# 启动开发服务器（前端 3000 + 后端 5001）
pnpm start
```

前端通过 `"proxy": "http://localhost:5001"` 将 `/api` 请求转发到后端。

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm start` | 同时启动前后端 |
| `cd backend && pnpm run dev` | 仅启动后端（bun --watch 热重载） |
| `cd frontend && pnpm start` | 仅启动前端 |
| `cd backend && pnpm run style:check` | 检查后端代码格式 |
| `cd backend && pnpm run style:format` | 自动修复格式 |
| `cd frontend && pnpm run build` | 构建前端到 `frontend/build/` |
| `cd backend && pnpm run build` | Bun 交叉编译到 `backend/dist/` |

## 生产部署

```bash
cd frontend && pnpm run build
cd backend && bun src/index.js
```

Express 会自动托管 `frontend/build/` 中的静态文件，所有未匹配路由回退到 `index.html`（SPA）。

## 构建独立二进制

使用 [Bun compile](https://bun.sh/docs/bundler/executables) 打包为独立可执行程序，支持交叉编译。

```bash
cd frontend && pnpm run build
cd backend && pnpm run build
```

产物：

```
backend/dist/
├── darwin-arm64/
│   ├── trans              # macOS arm64 可执行文件
│   └── public/            # 前端静态文件
└── linux-arm64/
    ├── trans              # Linux arm64 可执行文件（树莓派）
    └── public/            # 前端静态文件
```

运行（macOS）：`cd backend/dist/darwin-arm64 && ./trans`
部署到树莓派：将 `linux-arm64/` 目录整个复制到树莓派，然后 `cd linux-arm64 && ./trans`

## 环境变量

在 `backend/.env` 中配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `5001` | HTTP 服务端口 |
| `SOCKET_PORT` | `8888` | Socket 端口 |
| `SOCKET_BOARD_CAST` | `255.255.255.255` | UDP 广播地址 |

## 数据存储

运行时数据在 `backend/data/`（不提交到 Git）：

```
data/
├── database.sqlite        # SQLite 数据库
└── uploads/
    ├── files/             # 上传的文件
    └── images/            # 上传的图片
```

## API 接口

### 文件

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/files/upload` | 上传文件 |
| GET | `/api/files` | 文件列表 |
| GET | `/api/files/:fileName` | 获取文件信息 |
| GET | `/api/download/:fileName` | 下载文件 |
| DELETE | `/api/files/:fileName` | 删除文件 |

### 图片

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/images/upload` | 上传图片（5 MB 限制，仅限图片 MIME） |
| GET | `/api/images` | 图片列表 |
| GET | `/api/images/:filename` | 获取图片 |
| GET | `/api/images/download/:filename` | 下载图片 |
| DELETE | `/api/images/:filename` | 删除图片 |

### 剪贴板

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/clipboard` | 保存文本 |
| GET | `/api/clipboard` | 剪贴板历史 |
| DELETE | `/api/clipboard/:contentId` | 删除条目 |

### 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/server-info` | 服务器信息（IP、端口等） |

## 许可证

ISC
