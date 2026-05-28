/**
 * Cross-platform SEA (Single Executable Application) build script.
 *
 * Produces self-contained target directories for:
 *   dist/darwin-arm64/   — macOS Apple Silicon (M-series MacBook)
 *   dist/linux-arm64/    — Linux ARM64 (Raspberry Pi)
 *
 * Each target directory contains:
 *   trans                  — standalone Node.js SEA binary
 *   better_sqlite3.node    — native addon (loaded alongside binary)
 *   build/Release/         — addon fallback path (for bindings module)
 *   public/                — frontend static assets
 *
 * Usage:
 *   node scripts/build.mjs [--node22 <path-to-node22-binary>]
 *
 * Requirements:
 *   - macOS arm64 host
 *   - Node 22 available via fnm, or pass --node22 explicitly
 *   - curl (pre-installed on macOS)
 *   - Xcode CLI tools (codesign, strip)
 *   - esbuild (devDependency)
 *   - internet access for first run (downloads cached in ~/.cache/trans-app-build/)
 */

import { execSync } from 'child_process';
import { copyFileSync, cpSync, writeFileSync, mkdirSync, existsSync, rmSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const frontendBuild = path.resolve(root, '..', 'frontend', 'build');
const CACHE_DIR = path.join(os.homedir(), '.cache', 'trans-app-build');

// ── Pinned constants ──────────────────────────────────────────────────────
// Node 22.x ABI — all Node 22 patch versions share modules=127
const NODE_22_MODULES = '127';
const SQLITE_VERSION = '12.10.0';

// ── Build targets ──────────────────────────────────────────────────────────
const TARGETS = [
  { id: 'darwin-arm64', platform: 'darwin', arch: 'arm64' },
  { id: 'linux-arm64', platform: 'linux', arch: 'arm64' },
];

// ── CLI args ───────────────────────────────────────────────────────────────
const cliArgs = process.argv.slice(2);
const getArg = (flag) => {
  const i = cliArgs.indexOf(flag);
  return i !== -1 ? cliArgs[i + 1] : null;
};

// ── Helpers ────────────────────────────────────────────────────────────────
function ensureDir(d) {
  mkdirSync(d, { recursive: true });
}

function download(url, dest) {
  console.log(`    ↓ ${path.basename(dest)}`);
  ensureDir(path.dirname(dest));
  // Download to .tmp then rename to avoid a corrupted cache entry on failure
  execSync(`curl -fL --progress-bar -o "${dest}.tmp" "${url}"`, { stdio: 'inherit' });
  execSync(`mv "${dest}.tmp" "${dest}"`);
}

// ── Locate Node 22 darwin binary ───────────────────────────────────────────
function findNode22() {
  const override = getArg('--node22');
  if (override) {
    if (!existsSync(override)) throw new Error(`--node22 path not found: ${override}`);
    return override;
  }

  // Current process is already Node 22
  if (process.version.startsWith('v22.')) {
    return process.execPath;
  }

  // Try fnm
  try {
    const p = execSync('fnm exec --using=22 -- node --print "process.execPath"', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (p && existsSync(p)) return p;
  } catch {
    /* fnm not found or no v22 installed */
  }

  throw new Error(
    'Node 22 not found. Either:\n' +
      '  1. Switch to it:  fnm use 22 && node scripts/build.mjs\n' +
      '  2. Pass the path: node scripts/build.mjs --node22 /path/to/node22'
  );
}

// ── Get Node binary for a given target ────────────────────────────────────
// For darwin-arm64 we reuse the local Node 22 binary (it runs on this machine).
// For other targets we download and cache the official release tarball.
function getNodeBinary(nodeVersion, target, node22DarwinPath) {
  if (target.id === 'darwin-arm64') {
    return node22DarwinPath;
  }

  const filename = `node-v${nodeVersion}-${target.id}.tar.gz`;
  const cachePath = path.join(CACHE_DIR, filename);
  if (!existsSync(cachePath)) {
    download(`https://nodejs.org/dist/v${nodeVersion}/${filename}`, cachePath);
  }

  // Extract bin/node once and cache the raw binary
  const extractedBin = path.join(CACHE_DIR, `node-${nodeVersion}-${target.id}`);
  if (!existsSync(extractedBin)) {
    const entry = `node-v${nodeVersion}-${target.id}/bin/node`;
    // --strip-components 2 removes "node-vX.X.X-linux-arm64/bin/" prefix
    execSync(`tar -xzf "${cachePath}" --strip-components 2 -C "${CACHE_DIR}" "${entry}"`, {
      stdio: 'inherit',
    });
    // tar leaves the file as plain "node" in CACHE_DIR
    execSync(`mv "${path.join(CACHE_DIR, 'node')}" "${extractedBin}"`);
    execSync(`chmod +x "${extractedBin}"`);
  }

  return extractedBin;
}

// ── Get better-sqlite3 native addon for a given target ────────────────────
// Downloads the prebuild from GitHub releases and caches it.
// Prebuild archive layout (prebuild-install standard): build/Release/better_sqlite3.node
function getSqliteAddon(target) {
  const filename = `better-sqlite3-v${SQLITE_VERSION}-node-v${NODE_22_MODULES}-${target.id}.tar.gz`;
  const cachePath = path.join(CACHE_DIR, filename);
  if (!existsSync(cachePath)) {
    const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${SQLITE_VERSION}/${filename}`;
    download(url, cachePath);
  }

  const extractDir = path.join(CACHE_DIR, `sqlite3-${target.id}`);
  const addonPath = path.join(extractDir, 'build', 'Release', 'better_sqlite3.node');
  if (!existsSync(addonPath)) {
    ensureDir(extractDir);
    execSync(`tar -xzf "${cachePath}" -C "${extractDir}"`, { stdio: 'inherit' });
  }

  if (!existsSync(addonPath)) {
    throw new Error(`Failed to extract better_sqlite3.node from ${cachePath}`);
  }

  return addonPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

// ── Locate Node 22 ────────────────────────────────────────────────────────
console.log('🔍 Locating Node 22…');
const node22Path = findNode22();
const node22Version = execSync(`"${node22Path}" --version`, { encoding: 'utf8' }).trim().slice(1);
console.log(`   Node v${node22Version}  (${node22Path})`);

ensureDir(CACHE_DIR);

// Clean dist
if (existsSync(dist)) rmSync(dist, { recursive: true });
ensureDir(dist);

// ── Step 1: Bundle JS with esbuild ────────────────────────────────────────
console.log('\n→ Step 1: Bundling with esbuild…');
execSync(
  'npx esbuild src/index.js --bundle --platform=node --outfile=dist/esbuild/index.js --minify',
  { cwd: root, stdio: 'inherit' }
);
console.log('  ✓ dist/esbuild/index.js');

// ── Step 2: Verify frontend build ─────────────────────────────────────────
console.log('\n→ Step 2: Verifying frontend build…');
if (!existsSync(frontendBuild)) {
  console.error('  ✗ frontend/build not found. Run: cd frontend && pnpm run build');
  process.exit(1);
}
console.log('  ✓ frontend/build present');

// ── Step 3: Generate SEA blob (once, shared across targets) ───────────────
// useCodeCache must be false: V8 code cache is platform-specific and would
// corrupt the binary on a different platform from where the blob was generated.
console.log('\n→ Step 3: Generating SEA blob with Node v' + node22Version + '…');
const seaConfig = {
  main: path.join(dist, 'esbuild', 'index.js'),
  output: path.join(dist, 'sea-prep.blob'),
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: false,
};
writeFileSync(path.join(dist, 'sea-config.json'), JSON.stringify(seaConfig, null, 2));
execSync(`"${node22Path}" --experimental-sea-config "${path.join(dist, 'sea-config.json')}"`, {
  stdio: 'inherit',
});
console.log('  ✓ SEA blob generated');

// ── Step 4: Build each target ──────────────────────────────────────────────
const blob = path.join(dist, 'sea-prep.blob');

for (const target of TARGETS) {
  console.log(`\n→ Step 4 [${target.id}]: Building target…`);
  const targetDir = path.join(dist, target.id);
  ensureDir(targetDir);
  const outputBin = path.join(targetDir, 'trans');

  // 4a: Get the Node 22 binary for this platform
  console.log(`  Getting Node v${node22Version} ${target.id}…`);
  const nodeBin = getNodeBinary(node22Version, target, node22Path);

  // 4b: Copy Node binary as the output executable
  copyFileSync(nodeBin, outputBin);
  execSync(`chmod +x "${outputBin}"`);

  // 4c: Remove existing code signature before blob injection (macOS Mach-O only)
  if (target.platform === 'darwin') {
    execSync(`codesign --remove-signature "${outputBin}"`, { stdio: 'inherit' });
  }

  // 4d: Inject SEA blob via postject
  const machoFlag = target.platform === 'darwin' ? '--macho-segment-name NODE_SEA' : '';
  execSync(
    `npx --yes postject "${outputBin}" NODE_SEA_BLOB "${blob}" ` +
      `--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 ${machoFlag}`,
    { stdio: 'inherit', cwd: root }
  );

  // 4e: Strip debug symbols and re-sign (macOS only; macOS strip cannot handle ELF)
  if (target.platform === 'darwin') {
    try {
      execSync(`strip "${outputBin}"`, { stdio: 'inherit' });
    } catch {
      /* strip is optional */
    }
    execSync(`codesign --sign - "${outputBin}"`, { stdio: 'inherit' });
  }

  console.log(`  ✓ Binary: dist/${target.id}/trans`);

  // 4f: Copy better-sqlite3 native addon
  //     Place next to binary (our SEA loader in database.js reads from here)
  //     and in build/Release/ (fallback path used by the bindings module)
  console.log(`  Getting better-sqlite3 v${SQLITE_VERSION} for ${target.id}…`);
  const addonSrc = getSqliteAddon(target);
  copyFileSync(addonSrc, path.join(targetDir, 'better_sqlite3.node'));
  const addonFallbackDir = path.join(targetDir, 'build', 'Release');
  ensureDir(addonFallbackDir);
  copyFileSync(addonSrc, path.join(addonFallbackDir, 'better_sqlite3.node'));
  console.log('  ✓ Addon: better_sqlite3.node');

  // 4g: Copy frontend assets into each target dir
  //     SEA runtime resolves public/ relative to dirname(execPath)
  cpSync(frontendBuild, path.join(targetDir, 'public'), { recursive: true });
  console.log('  ✓ Frontend: public/');
}

// ── Step 5: Cleanup intermediate files ────────────────────────────────────
console.log('\n→ Step 5: Cleanup…');
rmSync(path.join(dist, 'esbuild'), { recursive: true });
rmSync(path.join(dist, 'sea-prep.blob'));
rmSync(path.join(dist, 'sea-config.json'));

// ── Summary ────────────────────────────────────────────────────────────────
console.log('\n✅ Build complete!\n');
for (const target of TARGETS) {
  const binPath = path.join(dist, target.id, 'trans');
  const sizeMB = (statSync(binPath).size / 1024 / 1024).toFixed(1);
  console.log(`   dist/${target.id}/trans   ${sizeMB} MB`);
}
console.log('\nTo run on macOS:  cd dist/darwin-arm64 && ./trans');
console.log('To run on Linux:  copy dist/linux-arm64/ to the Pi, then cd linux-arm64 && ./trans');
