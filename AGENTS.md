# AGENTS.md

## Project

LAN file/clipboard/image sharing tool. Single Express server (running on Bun) serves React frontend as static files + REST API. Can be packaged as standalone binaries via `bun build --compile` with cross-compilation for macOS arm64 and Linux arm64.

## Structure

- `backend/` — Express server on Bun (entry: `src/index.js`)
- `frontend/` — React CRA app (proxies `/api` to `localhost:5001`)
- Root `package.json` — runs both via `concurrently`
- Runtime: **Bun** (backend), **Node.js** (frontend CRA)
- Package manager: **pnpm** only. Never use npm/yarn/npx.

## Commands

```bash
pnpm install && cd frontend && pnpm install && cd ../backend && pnpm install  # install all deps
pnpm start                              # dev: frontend (3000) + backend (5001)
cd backend && pnpm run dev              # backend only, bun --watch hot-reload
cd frontend && pnpm start               # frontend only
cd backend && pnpm run style:check      # Prettier check
cd backend && pnpm run style:format     # Prettier fix
cd frontend && pnpm run build           # build React into frontend/build/
cd backend && pnpm run build            # Bun compile into backend/dist/ (requires frontend/build/ first)
```

No tests exist. `pnpm test` in backend is a placeholder that exits 1. `backend/test/` contains manual socket debug tools, not a test suite.

## Key Conventions

- **Filename encoding**: multer receives filenames as `latin1`; always decode with `Buffer.from(name, 'latin1').toString('utf8')`. See `backend/src/config/multer.js`.
- **Compiled-binary detection**: `utils/runtime.js` exports `isCompiled()` — checks `path.basename(process.execPath)` to distinguish compiled binary from `bun`/`node` dev mode.
- **sanitizeFilename middleware**: apply on any route with filename params to prevent path traversal.
- **Database**: `ContentItem` in `src/db/ContentItem.js` uses `bun:sqlite` prepared statements (not ORM). Table: `Contents`. Methods: `create()`, `findAll()`, `destroy(id)`. `destroy()` uses `SELECT changes()` for affected row count.
- **Logger**: `src/config/logger.js` wraps console. Use `logger.info/warn/error`.
- **CORS**: allows localhost + private IPs only (10.x, 172.16-31.x, 192.168.x).
- **Image upload**: 5 MB limit, non-image MIME rejected.
- **Prettier config** (backend): single quotes, 2-space indent, 100 char width, trailing commas es5, semicolons.
- **CSS**: single `App.css` with `@layer` blocks (tokens→reset→layout→components→utilities). Colors use OKLCH with `[data-theme]` variants (light/dark/forest/sunset/ocean).
- **UI language**: Chinese. Code/API: English.
- **Bun** required for backend runtime. Frontend still uses Node.js (CRA).

## Data

Runtime data at `process.cwd()/data/`: `database.sqlite`, `uploads/files/`, `uploads/images/`. Not committed.

## Environment

`backend/.env`: `PORT=5001`, `SOCKET_PORT=8888`, `SOCKET_BOARD_CAST=255.255.255.255`.

## Build Order

Frontend must be built before backend compile — `bun build --compile` copies `frontend/build/` into the binary's `public/` directory. The build script (`backend/scripts/build.mjs`) verifies this and exits if missing.

## Existing Instructions

See `.github/copilot-instructions.md` for detailed architecture layers, API routes, and conventions.
