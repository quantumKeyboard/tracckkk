// A tiny static server for trying the PWA locally (service workers need
// http://localhost or https -- they don't run from file://). No dependencies.
//   npm run serve            -> http://localhost:5173
//   PORT=8080 npm run serve
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 5173;
const TYPES = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json', '.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon',
  '.woff2':'font/woff2', '.md':'text/markdown; charset=utf-8',
};

createServer(async (req, res)=>{
  try{
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if(path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    if(!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if(!(await stat(file)).isFile()) throw new Error('not a file');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  }catch(err){
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  }
}).listen(port, ()=> console.log(`~track running at http://localhost:${port}`));
