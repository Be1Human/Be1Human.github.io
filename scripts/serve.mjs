import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4174);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${port}`).pathname);
    if (path === '/portfolio') { res.writeHead(302, { Location: '/portfolio/' }); res.end(); return; }
    if (path.startsWith('/portfolio/')) path = path.slice('/portfolio'.length);
    if (path.endsWith('/')) path += 'index.html';
    const target = resolve(root, `.${path}`);
    const relative = target.slice(root.length);
    if (!target.startsWith(root) || relative.split(/[\\/]/).some((part) => part.startsWith('.')) || /(^|[\\/])(data|scripts|src)([\\/]|$)/.test(relative)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const info = await stat(target);
    if (!info.isFile()) throw new Error('Not a file');
    const content = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Content-Length': content.length, 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 · 页面不存在');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}/portfolio/`));
process.on('SIGINT', () => server.close(() => process.exit(0)));
