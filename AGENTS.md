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
pnpm install                              # install all deps（pnpm workspace：根目录一次装完前后端）
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
cd backend && pnpm run build            # builds frontend first, then compiles both targets
```

Tests: `cd backend && pnpm test` (bun:test, isolated per-file), `cd frontend && pnpm test` (Vitest). CI (`.github/workflows/ci.yml`) runs backend Prettier check + tests, and frontend lint/typecheck/tests/build. `request/*.rest` are REST Client files for manual endpoint testing. Frontend has ESLint (`pnpm run lint`) and JSDoc type checking (`pnpm run typecheck`, TypeScript `checkJs`) in addition to `pnpm run build` (Vite).

## Key Conventions

- **Filename encoding**: multer receives filenames as `latin1`; always decode via `decodeFilename()` in `utils/decodeFilename.js` (see `backend/src/config/multer.js`).
- **Compiled-binary detection**: `utils/runtime.js` exports `isCompiled()` — checks `process.isBun` plus presence of a `public/` dir next to `process.execPath` to distinguish compiled binary from dev mode.
- **sanitizeFilename middleware**: apply on any route with filename params to prevent path traversal.
- **Database**: `ContentItem` in `src/db/ContentItem.js` uses `bun:sqlite` prepared statements (not ORM). Table: `Contents`. Methods: `create()`, `findAll({ limit, category })`, `findAllAfter(cursor, limit, category)`, `count({ category })`, `categorySummary()`, `updateCategory(id, category)`, `destroy(id)`. Ordered by `rowid DESC`. `destroy()` uses `SELECT changes()` for affected row count.
- **Pagination**: list endpoints (`GET /api/files`, `/api/images`, `/api/clipboard`) accept `?limit=&cursor=` (cursor = last item's name/rowid) and return `{ items, total, hasMore, nextCursor }`. Default page size is 50 (`DEFAULT_PAGE_SIZE`), capped at 100 (`MAX_PAGE_SIZE`), both in `utils/pagination.js`. Services must apply the default themselves so an omitted `limit` cannot trigger a full-directory scan. Parse via `utils/pagination.js`.
- **Clipboard limits**: single entry capped at 10000 chars (`MAX_CLIPBOARD_LENGTH` in `src/config/limits.js`); longer text returns 400. `deviceInfo` capped at 256 chars (`MAX_DEVICE_INFO_LENGTH` in `clipboardRoutes.js`). The `Contents` DB table holds clipboard history only (files/images live on disk), and `ContentItem.create()` auto-prunes to the most recent `MAX_HISTORY = 50` rows (value from `src/config/limits.js`).
- **Clipboard categories**: each entry has one optional `category` (normalized via `utils/normalizeCategory.js`, ≤ `MAX_CATEGORY_LENGTH`; blank = uncategorized). Filter semantics across DB→service→route: `undefined` = all, `null` = uncategorized, string = exact name. `GET /api/clipboard?category=` filters (empty value = 未分类), `PATCH /api/clipboard/:contentId` sets/clears (`category: null`), `GET /api/clipboard/categories` returns `{ categories, uncategorized, total }`. Frontend auto-suggests categories via `frontend/src/utils/detectCategory.js` (magnet → `torrent`, single http(s) URL → `Link`).
- **Clipboard category UI**: category entry goes through `frontend/src/components/CategoryField.js` (input + tappable chips) — do not reintroduce `<datalist>`, iOS Safari ignores it. Pure chip/storage logic lives in `frontend/src/utils/clipboardCategories.js`; the filter bar always keeps a placeholder chip for the active category (including 未分类) so an emptied filter can still be exited, and the active filter is remembered in `localStorage`.
- **Mobile layout (≤ `100ch`)**: sidebar becomes brand + theme / nav on two rows; the clipboard filter bar is sticky and horizontally scrollable; inputs use 16px font so iOS does not zoom on focus; touch targets stay ≥ 44px; heights use `100dvh` + `env(safe-area-inset-*)`.
- **SSE**: `/api/clipboard/events` allows at most 64 concurrent clients (`MAX_CLIENTS` in `services/clipboardEvents.js`); extra connections get 503. Events carry the change itself — `{ type: 'created'|'updated'|'deleted', item?, id?, category?, originId? }` — so subscribers patch their list locally instead of refetching the first page (see `frontend/src/utils/clipboardListPatch.js`). Write requests send `X-Client-Id` (`getClientId()` in `api/client.js`); the server echoes it as `originId` and the originator ignores its own echo. Only `created` (which also prunes the oldest row) falls back to a refetch.
- **Logger**: `src/config/logger.js` wraps console. Use `logger.info/warn/error`.
- **CORS / Origin guard**: exact hostname matching only — `localhost`, `[::1]`, 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16; requests with no `Origin` header always pass. Do not use prefix regexes: `localhost.evil.com` / `192.168.evil.com` must be rejected. Write methods (POST/PUT/PATCH/DELETE) additionally reject a present-but-disallowed `Origin` with 403 (`middleware/originGuard.js`) — CORS alone only withholds response headers and does not block requests (CSRF via cross-site multipart form upload).
- **Upload limits**: authoritative values in `src/config/limits.js` (100 MB files / 5 MB images / 10000 clipboard chars / 50 history items), re-exported by `src/config/multer.js` for file/image uploads (keep original name, `Date.now()-` prefix; images non-MIME-rejected). Same-ms name collisions get an incrementing suffix via `uniqueName`. Front-end mirror `frontend/src/utils/uploadLimits.js` is checked against these by `backend/test/limits.test.js`.
- **File name reversal**: `BaseService.getOriginalName(filename)` strips the `Date.now()-` prefix; `getTimestamp()` parses it for sorting.
- **Prettier config** (backend): single quotes, 2-space indent, 100 char width, trailing commas es5, semicolons.
- **CSS**: split under `frontend/src/styles/` with `@layer` blocks (tokens→reset→layout→components→utilities): `tokens.css` (declares layer order first), `base.css`, `components.css`, `animations.css`; imported in that order in `App.js`. Colors use OKLCH with `[data-theme]` variants (light/dark/forest/sunset/ocean).
- **UI language**: Chinese. Code/API: English.
- **Bun** required for backend runtime. Frontend still uses Node.js (Vite).

## Data

Runtime data at `process.cwd()/data/` (override with `DATA_DIR` env): `database.sqlite`, `uploads/files/`, `uploads/images/`. Not committed.

## Environment

`backend/.env`: `PORT=5001`, `DATA_DIR` (optional, data root dir).

## Build Order

`pnpm run build` (backend) runs `scripts/build.mjs`, which builds the frontend first, then compiles both `darwin-arm64` and `linux-arm64` targets into `backend/dist/` (each = `trans` binary + copied `frontend/build/` as `public/`). Use `bun scripts/build.mjs --skip-frontend` to skip the frontend step (requires `frontend/build/` to already exist). Cross-compilation needs Bun >= 1.1.5.

Production deploy (Raspberry Pi): `deploy/transapp.service` is a systemd unit; the binary expects its `public/` dir next to `process.execPath` and writes runtime data to `WorkingDirectory`.

## Workflow

- After each modification is complete, commit the changes immediately. Do not batch unrelated changes into one commit. Commit messages in **Chinese**, format `<type>: <描述>` (e.g. `feat: 添加文件上传`). Types: feat/fix/refactor/style/docs/chore (see `CONTRIBUTING.md`).

## Existing Instructions

See `.github/copilot-instructions.md` for detailed architecture layers, API routes, and conventions.
