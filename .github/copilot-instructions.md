# Copilot Instructions

## Project Overview

**TransApp** is a local-network file/clipboard/image sharing tool. It runs as a single Express server that serves the React frontend as static files and exposes a REST API. The app can be packaged into a standalone binary (`trans`) using Node.js 22 Single Executable Application (SEA).

## Monorepo Structure

- `backend/` — Node.js/Express server (entry: `src/index.js`)
- `frontend/` — React CRA app (proxies API to `http://localhost:5001`)
- Root `package.json` — runs both with `concurrently`
- Package manager: **pnpm** (Node.js >= 22 required)

## Commands

### Development
```bash
# Run both frontend and backend together (from repo root)
pnpm start

# Backend only (port 5001, hot-reload via nodemon)
cd backend && pnpm run dev

# Frontend only (CRA dev server, port 3000)
cd frontend && pnpm start
```

### Formatting (backend only)
```bash
cd backend && pnpm run style:check   # check Prettier
cd backend && pnpm run style:format  # auto-fix
```

### Building the standalone binary
```bash
cd frontend && pnpm run build        # build React into frontend/build/
cd backend && pnpm run build         # package via Node.js SEA into backend/dist/
```

The SEA build uses `@vercel/ncc` to bundle, then Node.js 22's `node:sea` API to create the binary. The native `better-sqlite3` addon (`better_sqlite3.node`) must be distributed alongside the binary.

## Architecture

### Request flow (production)
Express serves a `public/` directory (next to the binary) as static files. All API routes are prefixed `/api`. Any unmatched route returns `index.html` (SPA fallback).

### Request flow (development)
Frontend CRA dev server (`localhost:3000`) proxies `/api` calls to `localhost:5001` via the `"proxy"` field in `frontend/package.json`.

### Backend layers
```
src/index.js          → bootstraps Express, registers routes, error handler
src/routes/           → thin Express routers (fileRoutes, clipboardRoutes, imageRoutes, systemRoutes)
src/services/         → business logic (clipboardService singleton, FileService class)
src/db/               → better-sqlite3 instance (database.js) + active-record-style model (ContentItem.js)
src/config/           → multer storage factories (multer.js), logger wrapper (logger.js)
src/middleware/       → errorHandler.js, sanitizeFilename.js
src/utils/            → IP/network info, helpers
```

### Frontend layers
```
src/pages/            → route-level components (FileUpload, ImageUpload, SharedClipboard)
src/components/       → reusable UI (Toast, UploadZone, EmptyState, ThemePicker, ServerInfo)
src/api/client.js     → single fetch wrapper (api object); throws ApiError on non-OK responses
src/context/          → ToastContext (useToast hook; toast(message, type))
src/utils/            → shared helpers
```

### Data persistence
- SQLite database: `data/database.sqlite` (at `process.cwd()` at runtime, not committed)
- Uploaded files: `data/uploads/files/`
- Uploaded images: `data/uploads/images/`

## CSS Architecture

`frontend/src/App.css` is the single stylesheet, organised into named `@layer` blocks in this order: `tokens → reset → layout → components → utilities`.

**Color system (OKLCH)**
- Primitives: `--lch-primary`, `--lch-danger`, `--lch-accent` — raw `L% C H` values.
- Semantic tokens: `--color-primary`, `--color-bg-card`, `--color-ink`, etc., built with `oklch(var(--lch-*))`.
- Five themes via `[data-theme]`: `light`, `dark`, `forest`, `sunset`, `ocean` — each overrides only the primitives.
- Hover/active variants: use `filter: brightness(0.92)` instead of separate color tokens. Use `color-mix()` for derived surfaces (e.g. `--color-primary-bg`).

**Spacing**
- Horizontal spacing: `--inline-space: 1ch` (character-width units).
- Vertical spacing: `--block-space: 1rem`.
- Responsive breakpoint: `max-width: 100ch` — "is there room for content?" not a device size.

**Loading spinner**
- Pure CSS three-dot spinner via `-webkit-mask` / `mask` with `radial-gradient` + `@keyframes spinner-bounce`.
- Usage: `<span className="spinner" aria-label="…" />`. Inherits color via `currentColor`.

## Key Conventions

- **File upload filename encoding**: multer receives filenames as `latin1`; always decode with `Buffer.from(name, 'latin1').toString('utf8')` before using or returning filenames. This happens inside `createStorage` in `src/config/multer.js`.
- **Uploaded file naming**: files get a `Date.now()-originalName` prefix; images get a random `timestamp-random.ext` name.
- **Production vs. dev detection**: use `require('node:sea').isSea()` (not `process.pkg`). Wrapped in try/catch since the module only exists in Node 22+.
- **Logger**: `src/config/logger.js` is a thin wrapper over `console`. Use `logger.info/warn/error`.
- **All API routes** are registered under the `/api` prefix in `index.js`.
- **sanitizeFilename middleware**: use `sanitizeFilename('paramName')` on any route that takes a filename param to prevent path traversal.
- **Database model**: `ContentItem` in `src/db/ContentItem.js` uses prepared statements (not an ORM). Table name is `Contents`. Methods: `ContentItem.create()`, `ContentItem.findAll()`, `ContentItem.destroy(id)`.
- **CORS**: allows `localhost`, `127.x`, `10.x`, `172.16-31.x`, `192.168.x` — i.e., LAN only.
- **Image upload limit**: 5 MB enforced by multer; non-image MIME types are rejected.
- **No tests**: the test script is a placeholder. There are no test files to run.
- **Mixed languages**: UI strings and some comments are in Chinese; code/API responses use English.
