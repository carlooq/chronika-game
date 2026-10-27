import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv.includes('--preview')) {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { stdio:'inherit' });
  if (r.status) process.exit(r.status);
}
const base = path.resolve(root, 'dist');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json' };
const port = Number(process.env.PORT || 4173);
http.createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const filepath = path.resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!(filepath === base || filepath.startsWith(base + path.sep))) { res.writeHead(403).end('Forbidden'); return; }
  try {
    const info = await stat(filepath);
    if (!info.isFile()) throw Error('Not a file');
    res.writeHead(200, { 'Content-Type':types[path.extname(filepath)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(await readFile(filepath));
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`CHRONIKA: http://localhost:${port}`));
