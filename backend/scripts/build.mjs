/**
 * Cross-platform build script using Bun compile.
 *
 * Produces self-contained target directories for:
 *   dist/darwin-arm64/   — macOS Apple Silicon (M-series MacBook)
 *   dist/linux-arm64/    — Linux ARM64 (Raspberry Pi)
 *
 * Each target directory contains:
 *   trans       — standalone Bun-compiled binary (includes bun:sqlite)
 *   public/     — frontend static assets
 *
 * Usage:
 *   bun scripts/build.mjs                # builds frontend first, then compiles both targets
 *   bun scripts/build.mjs --skip-frontend # assumes frontend/build/ already exists
 *
 * Requirements:
 *   - Bun >= 1.13 (cross-compilation target support)
 *   - Node.js + pnpm (frontend Vite build)
 */

import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const frontendRoot = path.resolve(root, '..', 'frontend');
const dist = path.join(root, 'dist');
const frontendBuild = path.join(frontendRoot, 'build');

const TARGETS = [
  { id: 'darwin-arm64', bunTarget: 'bun-darwin-arm64' },
  { id: 'linux-arm64', bunTarget: 'bun-linux-arm64' },
];

const skipFrontend = process.argv.includes('--skip-frontend');

// ── Build frontend (unless explicitly skipped) ────────────────────────────
if (skipFrontend) {
  console.log('→ Step 1: Skipping frontend build (--skip-frontend)');
} else {
  console.log('→ Step 1: Building frontend…');
  execSync('pnpm run build', { cwd: frontendRoot, stdio: 'inherit' });
  console.log('  ✓ frontend/build ready');
}

if (!existsSync(frontendBuild)) {
  console.error(
    '  ✗ frontend/build not found. Run: cd frontend && pnpm run build, or drop --skip-frontend.'
  );
  process.exit(1);
}

// ── Clean dist ────────────────────────────────────────────────────────────
if (existsSync(dist)) rmSync(dist, { recursive: true });

// ── Build each target ─────────────────────────────────────────────────────
for (const target of TARGETS) {
  console.log(`\n→ Step 2 [${target.id}]: Compiling…`);
  const targetDir = path.join(dist, target.id);
  mkdirSync(targetDir, { recursive: true });

  const outfile = path.join(targetDir, 'trans');
  execSync(
    `bun build --compile --minify --target=${target.bunTarget} src/index.js --outfile "${outfile}"`,
    { cwd: root, stdio: 'inherit' }
  );
  console.log(`  ✓ Binary: dist/${target.id}/trans`);

  // Copy frontend assets (SEA resolves public/ relative to dirname(execPath))
  cpSync(frontendBuild, path.join(targetDir, 'public'), { recursive: true });
  console.log('  ✓ Frontend: public/');
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log('\n✅ Build complete!\n');
for (const target of TARGETS) {
  const binPath = path.join(dist, target.id, 'trans');
  const sizeMB = (statSync(binPath).size / 1024 / 1024).toFixed(1);
  console.log(`   dist/${target.id}/trans   ${sizeMB} MB`);
}
console.log('\nTo run on macOS:  cd dist/darwin-arm64 && ./trans');
console.log('To run on Linux:  copy dist/linux-arm64/ to the Pi, then cd linux-arm64 && ./trans');
