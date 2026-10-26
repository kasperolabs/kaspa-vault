#!/usr/bin/env node
// tools/serve.js - serves this folder over http://127.0.0.1:8080 for the demo page (no packages).
//   node tools/serve.js [port]      then open http://127.0.0.1:8080/demo/
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || 8080);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    let file = path.join(root, p);
    if (!path.extname(file) && fs.existsSync(file + '.html')) file += '.html';     // /site/how -> how.html, like Cloudflare Pages
    if (!file.startsWith(root + path.sep) || /node_modules|\.env|data\//.test(file)) { res.writeHead(404); return res.end('not found'); }
    fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(buf);
    });
}).listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}/demo/`));
