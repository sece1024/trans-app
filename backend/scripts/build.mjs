/**
 * SEA (Single Executable Application) build script.
 *
 * Produces:
 *   dist/trans               — standalone binary (current platform)
 *   dist/public/             — frontend static files
 *
 * Usage:
 *   node scripts/build.mjs [--node <path>]
 *
 * Requirements:
 *   - Node.js >= 22.x (for SEA support)
 *   - @vercel/ncc (devDependency)
 *   - postject: npx postject (ships with Node 22+)
 *   - macOS: codesign available (Xcode CLI tools)
 */

import { execSync } from 'child_process';
import {
  copyFileSync,
  cpSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
  statSync,
} from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const frontendBuild = path.resolve(root, '..', 'frontend', 'build');

// Parse --node flag
const args = process.argv.slice(2);
const nodeIdx = args.indexOf('--node');
const nodeBin = nodeIdx !== -1 && args[nodeIdx + 1]
  ? args[nodeIdx + 1]
  : process.execPath;

// Clean & create dist
if (existsSync(dist)) rmSync(dist, { recursive: true });
mkdirSync(dist, { recursive: true });

// ── Step 1: Bundle with ncc ─────────────────────────────────────────────
console.log('→ Bundling with ncc...');

execSync('npx ncc build src/index.js -o dist/ncc --minify', {
  cwd: root,
  stdio: 'inherit',
});

console.log('  ✓ Bundle created: dist/ncc/index.js');

// ── Step 2: Copy frontend build ─────────────────────────────────────────
console.log('→ Copying frontend build...');

if (!existsSync(frontendBuild)) {
  console.error('  ✗ frontend/build not found. Run "pnpm --filter frontend build" first.');
  process.exit(1);
}

cpSync(frontendBuild, path.join(dist, 'public'), { recursive: true });
console.log('  ✓ Copied frontend/build → dist/public');

// ── Step 3: Generate SEA blob ───────────────────────────────────────────
console.log('→ Generating SEA blob...');

const seaConfig = {
  main: path.join(dist, 'ncc', 'index.js'),
  output: path.join(dist, 'sea-prep.blob'),
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: true,
};
writeFileSync(path.join(dist, 'sea-config.json'), JSON.stringify(seaConfig));

execSync(`"${nodeBin}" --experimental-sea-config ${path.join(dist, 'sea-config.json')}`, {
  stdio: 'inherit',
});
console.log('  ✓ SEA blob generated');

// ── Step 4: Create binary ───────────────────────────────────────────────
console.log('→ Creating binary...');

const outputBin = path.join(dist, 'trans');
copyFileSync(nodeBin, outputBin);
execSync(`chmod +x "${outputBin}"`);

// On macOS, remove code signature before injection
if (process.platform === 'darwin') {
  execSync(`codesign --remove-signature "${outputBin}"`, { stdio: 'inherit' });
}

// Inject the SEA blob
const machoFlag = process.platform === 'darwin' ? '--macho-segment-name NODE_SEA' : '';
execSync(
  `npx --yes postject "${outputBin}" NODE_SEA_BLOB "${path.join(dist, 'sea-prep.blob')}" ` +
  `--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 ${machoFlag}`,
  { stdio: 'inherit', cwd: root }
);

// Strip debug symbols, then re-sign on macOS
if (process.platform === 'darwin') {
  try {
    execSync(`codesign --remove-signature "${outputBin}" 2>/dev/null`, { stdio: 'inherit' });
    execSync(`strip "${outputBin}"`, { stdio: 'inherit' });
  } catch { /* strip optional */ }
  execSync(`codesign --sign - "${outputBin}"`, { stdio: 'inherit' });
} else {
  try { execSync(`strip "${outputBin}"`, { stdio: 'inherit' }); } catch { /* optional */ }
}

console.log('  ✓ Binary created: dist/trans');

// ── Step 5: Copy native addon alongside binary ──────────────────────────
copyFileSync(
  path.join(dist, 'ncc', 'build', 'Release', 'better_sqlite3.node'),
  path.join(dist, 'better_sqlite3.node')
);
console.log('  ✓ Copied better_sqlite3.node');

// ── Step 6: Clean up intermediate files ─────────────────────────────────
rmSync(path.join(dist, 'ncc'), { recursive: true });
rmSync(path.join(dist, 'sea-prep.blob'));
rmSync(path.join(dist, 'sea-config.json'));

// ── Summary ─────────────────────────────────────────────────────────────
const binSize = (statSync(outputBin).size / 1024 / 1024).toFixed(1);
const addonSize = (statSync(path.join(dist, 'better_sqlite3.node')).size / 1024 / 1024).toFixed(1);

console.log('\n✅ Build complete!');
console.log(`   dist/trans               ${binSize} MB`);
console.log(`   dist/better_sqlite3.node ${addonSize} MB`);
console.log('   dist/public/             frontend assets');
console.log('\nTo run: cd dist && ./trans');
