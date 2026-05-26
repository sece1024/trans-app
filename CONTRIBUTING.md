# Contributing

## 环境要求

- **Node.js >= 22**（推荐使用 [fnm](https://github.com/Schniz/fnm) 管理版本）
- **pnpm**（项目统一使用 pnpm，不使用 npm 或 yarn）

## 安装依赖

```bash
# 根目录
pnpm install

# 前端
cd frontend && pnpm install

# 后端
cd backend && pnpm install
```

## 开发

```bash
# 同时启动前后端（推荐）
pnpm start

# 仅启动后端（端口 5001，nodemon 热重载）
cd backend && pnpm run dev

# 仅启动前端（端口 3000，CRA dev server）
cd frontend && pnpm start
```

## 代码风格

后端使用 Prettier 格式化，前端无单独配置（CRA 默认 ESLint）。

```bash
cd backend && pnpm run style:check   # 检查格式
cd backend && pnpm run style:format  # 自动修复
```

## 注意事项

### better-sqlite3 原生模块

`better-sqlite3` 包含 C++ 原生扩展（`.node` 二进制），必须针对当前 Node.js 版本编译。**切换 Node.js 大版本后**，需要在 `backend/` 目录重新编译：

```bash
cd backend && pnpm rebuild better-sqlite3
```

**背景**：每个 Node.js 大版本对应一个 ABI 版本号（NODE_MODULE_VERSION）。例如 Node 22 对应 127，Node 24 对应 137。用旧版本编译的 `.node` 文件无法在新版本中加载，会抛出 `ERR_DLOPEN_FAILED` 错误。

典型报错信息：

```
Error: The module '...better_sqlite3.node' was compiled against a different
Node.js version using NODE_MODULE_VERSION 127. This version of Node.js
requires NODE_MODULE_VERSION 137.
```

遇到此报错时，执行 `pnpm rebuild better-sqlite3` 即可解决。

### 包管理器

项目统一使用 pnpm。不要使用 `npm install`、`yarn add` 或 `npx`（脚本中直接调用本地安装的 CLI，例如 `prettier` 而非 `npx prettier`）。
