// Local production-asset server for tests; deployments use Nginx.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg' };
createServer(async (req, res) => {
    try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (pathname === '/healthz') { res.writeHead(200); res.end('ok'); return; }
        const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
        if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
        res.end(body);
    } catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.PORT ?? 8080), '127.0.0.1');
