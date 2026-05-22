# Trans App

一个用于在局域网内共享文本、图片和文件的应用程序。

## 功能特性

- 📁 **文件共享**：上传、下载、删除文件
- 🖼️ **图片共享**：上传、查看、下载、删除图片
- 📋 **剪贴板同步**：在不同设备间同步文本内容
- 🌐 **局域网访问**：支持局域网内多设备访问
- 🎨 **多主题切换**：支持亮色、暗色、森林、日落、海洋五种主题

## 技术栈

### 前端
- React 19
- React Router
- Framer Motion

### 后端
- Express.js
- better-sqlite3（轻量级 SQLite 驱动）
- Multer（文件上传）

## 项目结构

```
trans-app/
├── frontend/          # React 前端应用
├── backend/           # Express 后端服务
│   ├── src/           # 源代码
│   │   ├── db/        # 数据库（better-sqlite3）
│   │   ├── routes/    # API 路由
│   │   ├── services/  # 业务逻辑层
│   │   ├── middleware/ # 中间件（安全、错误处理）
│   │   └── config/    # 配置（multer、logger）
│   └── scripts/       # 构建脚本
├── doc/               # 项目文档
├── package.json       # 根项目配置
└── README.md
```

## 环境要求

- Node.js >= 22.0.0
- pnpm

## 安装依赖

```bash
# 安装根目录依赖
pnpm install

# 安装前端依赖
cd frontend && pnpm install

# 安装后端依赖
cd backend && pnpm install
```

## 运行项目

### 开发模式

```bash
# 同时启动前后端（推荐）
pnpm start

# 或者分别启动
cd backend && pnpm run dev
cd frontend && pnpm start
```

- 前端：http://localhost:3000
- 后端：http://localhost:5001

### 生产模式

```bash
# 1. 构建前端
cd frontend && pnpm run build

# 2. 启动后端（直接运行）
cd backend && pnpm start
```

Express 会自动托管 `frontend/build/` 中的静态文件。

## 构建独立二进制

使用 Node.js 22 的 [Single Executable Application (SEA)](https://nodejs.org/docs/latest-v22.x/api/single-executable-applications.html) 将应用打包为独立可执行文件。

### 前置条件

- Node.js 22（推荐使用 [fnm](https://github.com/Schniz/fnm) 管理版本）
- 已构建前端（`cd frontend && pnpm run build`）
- better-sqlite3 原生插件需为目标 Node 版本编译

### 构建步骤

```bash
# 确保前端已构建
cd frontend && pnpm run build

# 为 Node 22 重新编译原生插件
cd backend
BETTER_DIR=$(node -e "console.log(require.resolve('better-sqlite3/package.json').replace('/package.json',''))")
fnm exec --using=22 npx node-gyp rebuild --directory="$BETTER_DIR"

# 构建 SEA 二进制
fnm exec --using=22 node scripts/build.mjs
```

### 产物

```
backend/dist/
├── trans                    # 独立可执行文件（~85 MB）
├── better_sqlite3.node      # 原生插件（需随二进制分发）
└── public/                  # 前端静态文件
```

运行：`cd backend/dist && ./trans`

> **注意**：二进制体积主要来自嵌入的 Node.js 运行时（~85 MB），应用代码经 ncc 打包后仅约 3 MB。

## API 文档

### 文件接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/files/upload` | 上传文件 |
| GET | `/api/files` | 获取文件列表 |
| GET | `/api/files/:fileName` | 获取文件信息 |
| GET | `/api/download/:fileName` | 下载文件 |
| DELETE | `/api/files/:fileName` | 删除文件 |

### 图片接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/images/upload` | 上传图片 |
| GET | `/api/images` | 获取图片列表 |
| GET | `/api/images/:filename` | 获取图片 |
| GET | `/api/images/download/:filename` | 下载图片 |
| DELETE | `/api/images/:filename` | 删除图片 |

### 剪贴板接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/clipboard` | 保存文本内容 |
| GET | `/api/clipboard` | 获取剪贴板历史 |
| DELETE | `/api/clipboard/:contentId` | 删除剪贴板内容 |

### 系统接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/server-info` | 获取服务器信息 |

## 环境变量

在 `backend` 目录下创建 `.env` 文件：

```env
PORT=5001
```

## 数据存储

运行时数据存储在工作目录下的 `data/` 文件夹：

```
data/
├── database.sqlite        # SQLite 数据库
└── uploads/
    ├── files/             # 上传的文件
    └── images/            # 上传的图片
```

## 相关链接

- [项目理念](https://idea.hacks.tools/)

## 许可证

ISC