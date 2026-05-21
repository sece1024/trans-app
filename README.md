# Trans App

一个用于在局域网内共享文本、图片和文件的应用程序。

## 功能特性

- 📁 **文件共享**：上传、下载、删除文件
- 🖼️ **图片共享**：上传、查看、下载、删除图片
- 📋 **剪贴板同步**：在不同设备间同步文本内容
- 🌐 **局域网访问**：支持局域网内多设备访问

## 技术栈

### 前端
- React 19
- React Router
- Framer Motion

### 后端
- Express.js
- SQLite + Sequelize
- Multer（文件上传）

## 项目结构

```
trans-app/
├── frontend/          # React前端应用
├── backend/           # Express后端服务
├── package.json       # 根项目配置
└── README.md
```

## 环境要求

- Node.js >= 22.13.1
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
# 构建前端
cd frontend && pnpm run build

# 构建后端
cd backend && pnpm run build

# 运行构建后的程序
cd backend
chmod +x ./trans
./trans
```

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

## 构建说明

支持的平台：
- Linux x64
- Windows x64
- macOS ARM64

```bash
# 构建所有平台
cd backend && pnpm run build

# 构建特定平台
cd backend && pnpm run build:linux
cd backend && pnpm run build:macos
cd backend && pnpm run build:arm64
```

## 相关链接

- [项目理念](https://idea.hacks.tools/)

## 许可证

ISC