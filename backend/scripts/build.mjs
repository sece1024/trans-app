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
 *   bun scripts/build.mjs
 *
 * Requirements:
 *   - Bun >= 1.x
 *   - Frontend built first: cd frontend && pnpm run build
 */

import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const frontendBuild = path.resolve(root, '..', 'frontend', 'build');

const TARGETS = [
  { id: 'darwin-arm64', bunTarget: 'bun-darwin-arm64' },
  { id: 'linux-arm64', bunTarget: 'bun-linux-arm64' },
];

// ── Verify frontend build ─────────────────────────────────────────────────
console.log('→ Step 1: Verifying frontend build…');
if (!existsSync(frontendBuild)) {
  console.error('  ✗ frontend/build not found. Run: cd frontend && pnpm run build');
  process.exit(1);
}
console.log('  ✓ frontend/build present');

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
