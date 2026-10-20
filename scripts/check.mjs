// Fast sanity checks, run in CI on every push and pull request:
//   1. every .js file parses
//   2. every file listed in plugins/manifest.js exists
//   3. every plugin file registers exactly what the contract asks for
//      (type, label, min, defaultSize, createData, render) with a unique type
//   4. plugins don't hardcode hex colors (they should use css variables)
// Plugins are loaded in a tiny fake `window`, so this needs no browser.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = msg => problems.push(msg);

// 1. syntax
for(const dir of ['core', 'plugins', 'scripts']){
  for(const f of readdirSync(join(root, dir)).filter(f => /\.m?js$/.test(f))){
    const src = readFileSync(join(root, dir, f), 'utf8');
    if(f.endsWith('.mjs')) continue; // es modules: checked by actually running them in ci
    try{ new vm.Script(src, { filename: `${dir}/${f}` }); }
    catch(err){ fail(`${dir}/${f}: syntax error -- ${err.message}`); }
  }
}

// 2. manifest
const manifestCtx = { window: {} };
vm.runInNewContext(readFileSync(join(root, 'plugins/manifest.js'), 'utf8'), manifestCtx);
const extras = manifestCtx.window.TrackExtraPlugins || [];
const defaults = ['note.plugin.js', 'checklist.plugin.js', 'counter.plugin.js'];
for(const f of extras){
  if(!existsSync(join(root, 'plugins', f))) fail(`plugins/manifest.js lists "${f}" but plugins/${f} does not exist`);
}
const onDisk = readdirSync(join(root, 'plugins')).filter(f => f.endsWith('.plugin.js'));
for(const f of onDisk){
  if(!defaults.includes(f) && !extras.includes(f)) fail(`plugins/${f} exists but is not listed in plugins/manifest.js`);
}

// 3 + 4. contract
const seen = new Map();
for(const f of onDisk){
  const src = readFileSync(join(root, 'plugins', f), 'utf8');
  // just enough of a document for plugins that inject a <style> tag at load time
  const fakeEl = () => ({ style: {}, setAttribute(){}, appendChild(){} });
  const document = { getElementById: () => null, querySelector: () => null, createElement: fakeEl, head: fakeEl(), body: fakeEl() };
  const ctx = { window: {}, document, console };
  try{ vm.runInNewContext(src, ctx, { filename: f }); }
  catch(err){ fail(`plugins/${f}: threw while loading -- ${err.message}`); continue; }
  const pushed = ctx.window.TrackPlugins || [];
  if(pushed.length !== 1){ fail(`plugins/${f}: expected one window.TrackPlugins.push(...), found ${pushed.length}`); continue; }
  const p = pushed[0];
  if(typeof p.type !== 'string' || !/^[a-z0-9-]+$/.test(p.type)) fail(`plugins/${f}: "type" must be lowercase letters, numbers and hyphens`);
  if(typeof p.label !== 'string') fail(`plugins/${f}: missing "label"`);
  for(const k of ['min', 'defaultSize']){
    if(!Array.isArray(p[k]) || p[k].length !== 2 || !p[k].every(Number.isFinite)) fail(`plugins/${f}: "${k}" must be [width, height]`);
  }
  if(Array.isArray(p.min) && Array.isArray(p.defaultSize) && (p.defaultSize[0] < p.min[0] || p.defaultSize[1] < p.min[1])) fail(`plugins/${f}: defaultSize is smaller than min`);
  for(const k of ['createData', 'render']) if(typeof p[k] !== 'function') fail(`plugins/${f}: "${k}" must be a function`);
  if(p.init && typeof p.init !== 'function') fail(`plugins/${f}: "init" must be a function if present`);
  if(seen.has(p.type)) fail(`plugins/${f}: type "${p.type}" is already used by plugins/${seen.get(p.type)}`);
  seen.set(p.type, f);
  if(typeof p.createData === 'function'){
    try{ JSON.stringify(p.createData()); }
    catch(err){ fail(`plugins/${f}: createData() must return json-safe data -- ${err.message}`); }
  }
  // strip comments, then look for #rgb / #rrggbb literals
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const hex = code.match(/['"`(:\s]#[0-9a-fA-F]{3,8}\b/g);
  if(hex) fail(`plugins/${f}: hardcoded color(s) ${[...new Set(hex.map(h => h.slice(1)))].join(', ')} -- use css variables like var(--main)`);
}

if(problems.length){
  console.error(problems.map(p => '  x ' + p).join('\n'));
  console.error(`\n${problems.length} problem(s) found`);
  process.exit(1);
}
console.log(`ok -- ${onDisk.length} plugins, manifest and syntax all check out`);
