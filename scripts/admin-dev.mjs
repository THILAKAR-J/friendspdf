#!/usr/bin/env node
// Local test of the admin: serves dist/ and runs the real Cloudflare function for /admin/api/*,
// with GitHub replaced by a local file (CONTENT_FILE, default data/content.json). Password: "test".
//   npm run build && PORT=4190 node scripts/admin-dev.mjs
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequest } from '../functions/admin/api/[[path]].js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const FILE = process.env.CONTENT_FILE || join(ROOT, 'data/content.json');
const PORT = Number(process.env.PORT || 4190);
// Serve pages with the same Content-Security-Policy as production (from dist/_headers), so a CSP problem shows up here.
const CSP = (existsSync(join(DIST, '_headers')) && (readFileSync(join(DIST, '_headers'), 'utf8').match(/Content-Security-Policy: (.*)/) || [])[1]) || '';
const env = { ADMIN_PASSWORD: 'test', SESSION_SECRET: 'local-secret', GITHUB_TOKEN: 'x', GITHUB_REPO: 'local/test', CONTENT_BRANCH: 'dev' };
const commits = [{ sha: 'a1b2c3d4e5', commit: { message: 'FriendsPDF: free in-browser PDF and image tools', author: { name: 'THILAKAR-J', date: new Date().toISOString() } } }];
let sha = 'sha0';

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  if (!String(url).startsWith('https://api.github.com/')) return realFetch(url, init);
  const path = String(url).replace(/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+\//, '');
  const method = init.method || 'GET';
  if (path.startsWith('contents/data/content.json')) {
    if (method === 'GET') return Response.json({ content: Buffer.from(existsSync(FILE) ? readFileSync(FILE) : '{}').toString('base64'), sha });
    const body = JSON.parse(init.body);
    if (body.sha !== sha) return new Response('{}', { status: 409 });
    writeFileSync(FILE, Buffer.from(body.content, 'base64'));
    sha = 'sha' + (Number(sha.slice(3)) + 1);
    commits.unshift({ sha: sha + 'xxxxxx', commit: { message: body.message, author: { name: 'THILAKAR-J', date: new Date().toISOString() } } });
    return Response.json({ content: { sha }, commit: { sha: sha + 'xxxxxx' } });
  }
  if (path.startsWith('commits')) return Response.json(commits);
  return new Response('{}', { status: 404 });
};

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  if (u.pathname.startsWith('/admin/api/')) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const request = new Request(u, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const r = await onRequest({ request, env, params: { path: u.pathname.slice('/admin/api/'.length).split('/') } });
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  let f = join(DIST, decodeURIComponent(u.pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', ...(CSP ? { 'Content-Security-Policy': CSP } : {}) }); res.end(readFileSync(f));
}).listen(PORT, () => console.log(`Admin test server on http://localhost:${PORT}/admin/ (password: test)`));
