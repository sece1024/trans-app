# AGENTS.md

## Project

LAN file/clipboard/image sharing tool. Single Express server (running on Bun) serves React frontend as static files + REST API. Can be packaged as standalone binaries via `bun build --compile` with cross-compilation for macOS arm64 and Linux arm64.

## Structure

- `backend/` — Express server on Bun (entry: `src/index.js`)
- `frontend/` — React Vite app (dev proxy: `/api` → `localhost:5001`)
- Root `package.json` — runs both via `concurrently`
- Runtime: **Bun** (backend), **Node.js** (frontend Vite)
- Package manager: **pnpm** only. Never use npm/yarn/npx.

## Commands

```bash
pnpm install && cd frontend && pnpm install && cd ../backend && pnpm install  # install all deps
pnpm start                              # dev: frontend (5173) + backend (5001)
cd backend && pnpm run dev              # backend only, bun --watch hot-reload
cd frontend && pnpm run dev             # frontend only (Vite)
cd backend && pnpm run style:check      # Prettier check
cd backend && pnpm run style:format     # Prettier fix
cd backend && pnpm test                 # backend tests (bun:test, isolated)
cd frontend && pnpm test                # frontend tests (Vitest)
cd frontend && pnpm run lint            # frontend ESLint
cd frontend && pnpm run typecheck       # frontend TypeScript checkJs (JSDoc types)
cd frontend && pnpm run build           # build React into frontend/build/
cd backend && pnpm run build            # Bun compile into backend/dist/ (requires frontend/build/ first)
```

Tests: `cd backend && pnpm test` (bun:test, isolated per-file), `cd frontend && pnpm test` (Vitest). CI runs backend tests + frontend lint/typecheck/tests/build via `.github/workflows/ci.yml`. `request/*.http` are REST Client files for manual endpoint testing. Frontend has ESLint (`pnpm run lint`) and JSDoc type checking (`pnpm run typecheck`, TypeScript `checkJs`) in addition to `pnpm run build` (Vite).

## Key Conventions

- **Filename encoding**: multer receives filenames as `latin1`; always decode via `decodeFilename()` in `utils/decodeFilename.js` (see `backend/src/config/multer.js`).
- **Compiled-binary detection**: `utils/runtime.js` exports `isCompiled()` — checks `Bun.isBun` plus presence of a `public/` dir next to `process.execPath` to distinguish compiled binary from dev mode.
- **sanitizeFilename middleware**: apply on any route with filename params to prevent path traversal.
- **Database**: `ContentItem` in `src/db/ContentItem.js` uses `bun:sqlite` prepared statements (not ORM). Table: `Contents`. Methods: `create()`, `findAll({ limit })`, `findAllAfter(cursor, limit)`, `count()`, `destroy(id)`. Ordered by `rowid DESC`. `destroy()` uses `SELECT changes()` for affected row count.
- **Pagination**: list endpoints (`GET /api/files`, `/api/images`, `/api/clipboard`) accept `?limit=&cursor=` (cursor = last item's name/rowid) and return `{ items, total, hasMore, nextCursor }`. Parse via `utils/pagination.js`.
- **Clipboard limit**: single clipboard entry capped at 10000 chars (`MAX_CLIPBOARD_LENGTH` in `clipboardRoutes.js`); longer text returns 400.
- **Logger**: `src/config/logger.js` wraps console. Use `logger.info/warn/error`.
- **CORS**: allows localhost/127.x + private IPs only (10.x, 172.16-31.x, 192.168.x); requests with no `Origin` header always pass.
- **Upload limits** (`src/config/multer.js`): files 100 MB (keep original name, `Date.now()-` prefix); images 5 MB, non-image MIME rejected. Same-ms name collisions get an incrementing suffix via `uniqueName`.
- **File name reversal**: `BaseService.getOriginalName(filename)` strips the `Date.now()-` prefix; `getTimestamp()` parses it for sorting.- **Prettier config** (backend): single quotes, 2-space indent, 100 char width, trailing commas es5, semicolons.
- **CSS**: single `App.css` with `@layer` blocks (tokens→reset→layout→components→utilities). Colors use OKLCH with `[data-theme]` variants (light/dark/forest/sunset/ocean).
- **UI language**: Chinese. Code/API: English.
- **Bun** required for backend runtime. Frontend still uses Node.js (Vite).

## Data

Runtime data at `process.cwd()/data/` (override with `DATA_DIR` env): `database.sqlite`, `uploads/files/`, `uploads/images/`. Not committed.

## Environment

`backend/.env`: `PORT=5001`, `DATA_DIR` (optional, data root dir).

## Build Order

Frontend must be built before backend compile — `bun build --compile` copies `frontend/build/` into the binary's `public/` directory. The build script (`backend/scripts/build.mjs`) verifies this and exits if missing.

## Workflow

- After each modification is complete, commit the changes immediately. Do not batch unrelated changes into one commit. Commit messages in **Chinese**, format `<type>: <描述>` (e.g. `feat: 添加文件上传`). Types: feat/fix/refactor/style/docs/chore (see `CONTRIBUTING.md`).

## Existing Instructions

See `.github/copilot-instructions.md` for detailed architecture layers, API routes, and conventions.
