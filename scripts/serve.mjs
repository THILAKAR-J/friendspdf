// Local static server that mimics production: clean URLs, 404.html, and the CSP from dist/_headers.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const DIST = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'dist');
const PORT = +process.env.PORT || 8080;
const PREFIX = process.env.PREFIX || '/'; // e.g. /friendspdf/ to mimic GitHub Pages
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.pfb': 'application/octet-stream', '.bcmap': 'application/octet-stream', '.ttf': 'font/ttf' };
const csp = fs.readFileSync(path.join(DIST, '_headers'), 'utf8').match(/Content-Security-Policy: (.*)/)[1];
http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  const send = (code, file) => {
    res.writeHead(code, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(file).pipe(res);
  };
  if (!url.startsWith(PREFIX)) return send(404, path.join(DIST, '404.html'));
  url = '/' + url.slice(PREFIX.length);
  let file = path.join(DIST, url);
  if (!file.startsWith(DIST)) return send(404, path.join(DIST, '404.html'));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!url.endsWith('/')) { res.writeHead(301, { Location: PREFIX + url.slice(1) + '/' }); return res.end(); }
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) return send(404, path.join(DIST, '404.html'));
  send(200, file);
}).listen(PORT, () => console.log(`http://localhost:${PORT}${PREFIX}`));
