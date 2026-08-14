# Copilot Instructions

## Project Overview

**TransApp** is a local-network file/clipboard/image sharing tool. It runs as a single Express server that serves the React frontend as static files and exposes a REST API. The app can be packaged into standalone binaries (`trans`) using Bun's built-in compile feature, with cross-compilation support for macOS arm64 and Linux arm64.

## Monorepo Structure

- `backend/` — Express server running on Bun (entry: `src/index.js`)
- `frontend/` — React Vite app (dev proxy `/api` → `http://localhost:5001`)
- Root `package.json` — runs both with `concurrently`
- Runtime: **Bun** (backend), **Node.js** (frontend Vite)
- Package manager: **pnpm** (never npm/yarn/npx)

## Commands

### Development
```bash
# Run both frontend and backend together (from repo root)
pnpm start

# Backend only (port 5001, hot-reload via bun --watch)
cd backend && pnpm run dev

# Frontend only (Vite dev server, port 5173)
cd frontend && pnpm run dev
```

### Formatting (backend only)
```bash
cd backend && pnpm run style:check   # check Prettier
cd backend && pnpm run style:format  # auto-fix
```

### Building standalone binaries
```bash
cd frontend && pnpm run build        # build React into frontend/build/
cd backend && pnpm run build         # compile via Bun into backend/dist/
```

The build uses `bun build --compile` with cross-compilation. It produces two target directories:
- `dist/darwin-arm64/` — macOS Apple Silicon (M-series)
- `dist/linux-arm64/` — Linux ARM64 (Raspberry Pi)

Each target contains only the `trans` binary and a `public/` directory (frontend assets). No native addons needed — `bun:sqlite` is built into the Bun runtime.

## Architecture

### Request flow (production)
Express serves a `public/` directory (next to the binary) as static files. All API routes are prefixed `/api`. Any unmatched route returns `index.html` (SPA fallback).

### Request flow (development)
Frontend Vite dev server (`localhost:5173`) proxies `/api` calls to `localhost:5001` via `server.proxy` in `frontend/vite.config.js`.

### Backend layers
```
src/index.js          → loads dotenv, starts the Express app
src/app.js            → builds/configure the Express app (middleware, routes, error handler); exported for tests
src/routes/           → thin Express routers (fileRoutes, clipboardRoutes, imageRoutes, systemRoutes)
src/services/         → business logic (BaseService ← FileService; ClipboardService singleton)
src/db/               → bun:sqlite instance (database.js) + active-record-style model (ContentItem.js)
src/config/           → multer storage factories (multer.js), logger wrapper (logger.js), paths (paths.js)
src/middleware/       → errorHandler.js, sanitizeFilename.js, rateLimiter.js
src/utils/            → IP/network info, runtime.js (compiled-binary detection), contentDisposition.js, decodeFilename.js, streamResponse.js, pagination.js
```

**Service inheritance**: `BaseService` provides `getFilePath()`, `exists()`, `delete()`, `createReadStream()`, and `list()` (paginated: returns `{ items, total, hasMore }`). `ClipboardService` is independent (DB only) and exported as a singleton (`module.exports = new ClipboardService()`). `FileService` is exported as a class (instantiated in routes with the upload dir path; `{ includeSize: true }` adds file sizes to `list()` for the files endpoint). `BaseService.delete()` catches `ENOENT` and returns `false` (not found) rather than pre-checking with `existsSync`.

### Frontend layers
```
src/pages/            → route-level components (FileUpload, ImageUpload, SharedClipboard)
src/components/       → reusable UI (Toast, UploadZone, EmptyState, ThemePicker, ServerInfo)
src/api/client.js     → single fetch wrapper (api object); throws ApiError on non-OK responses
src/context/          → ToastContext (useToast hook; toast(message, type))
src/utils/animations.js  → Framer Motion variants (containerVariants, cardVariants) used across pages
src/utils/uploadHelpers.js → downloadFile(), copyLink() — use these, not raw fetch/anchor
```

### Data persistence
- SQLite database: `data/database.sqlite` (at `process.cwd()` at runtime; override root via `DATA_DIR` env, see `src/config/paths.js`)
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

- **File upload filename encoding**: multer receives filenames as `latin1`; always decode via `decodeFilename()` in `src/utils/decodeFilename.js` before using or returning filenames.
- **Uploaded file naming**: both files and images get a `Date.now()-originalName` prefix; reverse it with `BaseService.getOriginalName(filename)` (strips everything before the first `-`). `BaseService.getTimestamp()` parses the prefix for sorting. Same-ms collisions get an incrementing suffix via `uniqueName` in `src/config/multer.js`.
- **Production vs. dev detection**: `utils/runtime.js` exports `isCompiled()` which checks `Bun.isBun` plus a `public/` dir next to `process.execPath` — returns `true` when running as the compiled `trans` binary, `false` when running via `bun` or `node`.
- **Logger**: `src/config/logger.js` is a thin wrapper over `console` (prefixes ISO timestamps). Use `logger.info/warn/error`.
- **All API routes** are registered under the `/api` prefix in `app.js`.
- **sanitizeFilename middleware**: use `sanitizeFilename('paramName')` on any route that takes a filename param to prevent path traversal.
- **Rate limiting**: write methods (POST/PUT/PATCH/DELETE) under `/api` are rate-limited per IP via `src/middleware/rateLimiter.js`.
- **Database model**: `ContentItem` in `src/db/ContentItem.js` uses `bun:sqlite` prepared statements (not an ORM). Table name is `Contents`. Methods: `ContentItem.create()`, `ContentItem.findAll({ limit, offset })`, `ContentItem.count()`, `ContentItem.destroy(id)`. `destroy()` uses `SELECT changes()` to get the affected row count since `bun:sqlite`'s `stmt.run()` returns `undefined`.
- **CORS**: allows `localhost`, `127.x`, `10.x`, `172.16-31.x`, `192.168.x` — i.e., LAN only.
- **Image upload limit**: 5 MB enforced by multer; non-image MIME types are rejected.
- **Tests**: backend `bun test --isolate` (`backend/test/`), frontend `vitest run` (`frontend/test/`). CI runs both via `.github/workflows/ci.yml`.
- **Mixed languages**: UI strings and some comments are in Chinese; code/API responses use English.

## Error Handling Pattern

Routes use try/catch and pass errors to Express's error handler via `next(err)`. The global `errorHandler` middleware (`src/middleware/errorHandler.js`) logs and responds:
- `LIMIT_FILE_SIZE` → 400 "File too large"
- `err.status < 500` → use `err.message` in response
- Otherwise → 500 "Internal server error"

In services and routes, re-throw with cause to preserve the stack:
```js
throw new Error('Failed to save clipboard', { cause: error });
```

## API Routes Reference

List endpoints (`GET /api/files`, `/api/images`, `/api/clipboard`) accept `?limit=&offset=` and return `{ items, total, hasMore }`.

### Files
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/files/upload` | Upload file |
| GET | `/api/files` | List files (paginated) |
| GET | `/api/files/:fileName` | Get file info |
| GET | `/api/download/:fileName` | Download file |
| DELETE | `/api/files/:fileName` | Delete file |

### Images
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/images/upload` | Upload image (5 MB, image MIME only) |
| GET | `/api/images` | List images (paginated) |
| GET | `/api/images/:filename` | Serve image |
| GET | `/api/images/download/:filename` | Download image |
| DELETE | `/api/images/:filename` | Delete image |

### Clipboard
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/clipboard` | Save text `{ text, deviceInfo }` |
| GET | `/api/clipboard` | Get history (paginated) |
| DELETE | `/api/clipboard/:contentId` | Delete entry |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/server-info` | Server IP, port info |

## Adding New Features

### New backend API
1. Add router in `src/routes/`, mount under `/api` in `index.js`
2. Business logic in `src/services/` — extend `BaseService` if file-based
3. DB operations: add prepared-statement methods to `ContentItem.js`
4. Apply `sanitizeFilename('param')` on any route with filename params
5. Run `cd backend && pnpm run style:format`

### New frontend page
1. Create page component in `src/pages/`
2. Add `<Route>` in `App.js`
3. API calls via `src/api/client.js` — add new methods to the `api` object
4. File downloads via `downloadFile()` from `src/utils/uploadHelpers.js`

## Manual Testing

`request/` directory contains REST Client (`.http`) files for manually testing all API endpoints.
