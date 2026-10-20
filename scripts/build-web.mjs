// Copies the web app into dist/ -- the folder the native app (Tauri) and the
// GitHub Pages deploy both ship. There's no bundling or transpiling: the app
// runs as-is, this only picks out which files belong in a release.
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');

const INCLUDE = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'core',
  'plugins',
  'vendor',
  'assets',
];
// personal/local files that may sit in a working copy but never ship
const EXCLUDE = [join('plugins', 'assets')];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for(const entry of INCLUDE){
  const src = join(root, entry);
  if(!existsSync(src)){ console.error(`missing: ${entry}`); process.exit(1); }
  cpSync(src, join(out, entry), {
    recursive: true,
    filter: p => !EXCLUDE.some(x => p.startsWith(join(root, x))),
  });
}
console.log(`web app copied to ${out}`);
