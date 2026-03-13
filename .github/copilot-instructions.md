# Copilot Instructions

## Project Overview

**TransApp** is a local-network file/clipboard/image sharing tool. It runs as a single server (Express) that serves the React frontend as static files and exposes a REST + WebSocket API. The app can be packaged into a standalone binary (`trans`) using `pkg`.

## Monorepo Structure

- `backend/` — Node.js/Express server (entry: `src/index.js`)
- `frontend/` — React CRA app (proxies API to `http://localhost:5001`)
- Root `package.json` — runs both with `concurrently`

## Commands

### Development
```bash
# Run both frontend and backend together (from repo root)
npm start

# Backend only (port 5001, hot-reload via nodemon)
cd backend && npm run dev

# Frontend only (CRA dev server, port 3000)
cd frontend && npm start
```

### Formatting
```bash
cd backend && npm run style:check   # check Prettier
cd backend && npm run style:format  # auto-fix
```

### Building the standalone binary
```bash
cd frontend && npm run build        # build React into frontend/build/
cd backend && npm run build         # package into backend/dist/ via pkg
```

## Architecture

### Request flow (production)
Express serves `frontend/build/` as static files. All API routes are prefixed `/api`. Any unmatched route returns `frontend/build/index.html` (SPA fallback).

### Request flow (development)
Frontend CRA dev server (`localhost:3000`) proxies `/api` calls to `localhost:5001` via the `"proxy"` field in `frontend/package.json`.

### Backend layers
```
src/index.js          → bootstraps Express, calls sequelize.sync(), starts WebSocket
src/routes/           → thin Express routers, one file per feature (file, clipboard, image, system)
src/services/         → business logic (clipboardService, dataService, socket)
src/db/               → Sequelize instance (database.js) + models (ContentItem.js)
src/config/           → multer storage config, logger wrapper
src/utils/            → internet (IP/network info), cleanup, tool helpers
```

### Data persistence
- SQLite database: `data/database.sqlite` (created at `process.cwd()` at runtime, not committed)
- Uploaded files: `data/uploads/files/`
- Uploaded images: `data/uploads/images/`

## Key Conventions

- **File upload filename encoding**: multer receives filenames as `latin1`; always decode with `Buffer.from(name, 'latin1').toString('utf8')` before using or returning filenames.
- **Production vs. dev detection**: use `process.pkg` (truthy when running as a `pkg` binary).
- **Logger**: `src/config/logger.js` is a thin wrapper over `console`—not a real logging library. Use `logger.info/warn/error`.
- **All API routes** are registered under the `/api` prefix in `index.js`.
- **Uploading duplicate files**: multer config silently deletes the existing file before saving the new one with the same name.
- **No tests**: the test script is a placeholder. There are no test files to run.
- **Mixed languages**: UI strings and some comments are in Chinese; code/API responses use English.
- **Sequelize model name**: the model is defined as `'Content'` (table: `Contents`), exported as `ContentItem`.
