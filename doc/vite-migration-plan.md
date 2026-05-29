# 前端 Vite 迁移计划

## 背景

前端使用 Create React App（react-scripts 5.0.1），CRA 已被 React 团队官方废弃。
迁移目标：用 Vite 替换 CRA，保持业务代码零改动。

## 现状

- 804 行 JS，15 个文件，5 个活跃依赖
- 无 `process.env` 用法，无 `.env` 文件依赖
- 后端在 2 处引用 `frontend/build` 路径（`backend/src/index.js:29`、`backend/scripts/build.mjs:28`）

## 迁移范围

| 类别 | 变更 |
|---|---|
| 删除 | `react-scripts`、`cra-template`、`web-vitals` |
| 新增 | `vite`、`@vitejs/plugin-react` |
| 修改 | `package.json`、`index.html`、`src/index.js`、根 `.gitignore`、`frontend/.gitignore` |
| 新建 | `frontend/vite.config.js` |
| 不动 | 所有 15 个 `src/` 文件 |

---

## Step 1：新建 `frontend/vite.config.js`

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
  build: {
    outDir: 'build', // 保持与 CRA 一致，后端路径无需修改
  },
});
```

关键决策：`outDir: 'build'` 保持输出目录不变。

## Step 2：移动 `public/index.html` → 根目录 `index.html`

Vite 要求 `index.html` 在项目根目录。

变更：
- 移动 `frontend/public/index.html` → `frontend/index.html`
- 删除所有 `%PUBLIC_URL%`（Vite 中 `/` 就是根路径）
- 删除 CRA 模板注释
- 标题改为 `TransApp`
- `<body>` 末尾加入 `<script type="module" src="/src/index.js"></script>`
- `favicon.ico`、`manifest.json`、`robots.txt`、`logo192.png`、`logo512.png` 留在 `public/`

新 `frontend/index.html`：

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="LAN file/clipboard/image sharing tool" />
    <link rel="apple-touch-icon" href="/logo192.png" />
    <link rel="manifest" href="/manifest.json" />
    <title>TransApp</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script type="module" src="/src/index.js"></script>
  </body>
</html>
```

## Step 3：更新 `frontend/package.json`

删除项：
- `react-scripts`（CRA 核心）
- `cra-template`（模板文件）
- `web-vitals`（从未使用）
- `proxy` 字段（迁移到 vite.config.js）
- `browserslist`（Vite 用 `build.target`）
- `eslintConfig`（后续可选加回）

新增项：
- `devDependencies` 中加 `vite` 和 `@vitejs/plugin-react`

脚本变更：
- `"start"` → `"dev": "vite"`
- `"build"` → `"build": "vite build"`
- 新增 `"preview": "vite preview"`
- 删除 `"test"` 和 `"eject"`

## Step 4：更新 `frontend/src/index.js`

- 删除 `import React from 'react'`（React 19 不需要，Vite 自动处理 JSX）
- 可选删除 `<React.StrictMode>` 包裹

```js
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

## Step 5：更新 `.gitignore`

根 `.gitignore`：
- `frontend/build/` 保持不变

`frontend/.gitignore`：
- 删除 `.pnp`、`.pnp.js`（CRA 特有）
- `/build` 保留

## Step 6：更新文档中的命令

`README.md` 和 `CONTRIBUTING.md` 中：
- 开发命令 `cd frontend && pnpm start` → `cd frontend && pnpm run dev`
- 删除 `react-scripts` 相关说明

## Step 7：验证

```bash
cd frontend && pnpm run dev       # 开发服务器启动，/api 代理正常
cd frontend && pnpm run build     # 输出到 frontend/build/
cd backend && pnpm start          # 后端正确托管 frontend/build/
cd backend && pnpm run build      # SEA 构建不受影响
```

---

## 风险评估

| 风险 | 级别 | 说明 |
|---|---|---|
| 业务代码改动 | 无 | src/ 下零改动 |
| CSS 兼容性 | 无 | Vite 原样处理 CSS |
| 构建产物差异 | 低 | Vite 输出更小（Rollup vs Webpack） |
| 后端路径失效 | 无 | outDir: 'build' 保持一致 |
| 开发体验 | 正向 | HMR 更快，启动更快 |
