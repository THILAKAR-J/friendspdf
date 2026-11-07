// Static site generator: node build.mjs  -> dist/
// Env: INDEXING=off (adds noindex + robots Disallow, for previews), BASE_PATH=/friendspdf/ (only used by 404.html).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SITE, TOOL_PAGES } from './src/site.mjs';
import { layout } from './src/templates.mjs';
import { homePage, toolsPage, toolPage, examPage, guidePage, recentPage, privacyPage, termsPage, notFoundPage } from './src/pages.mjs';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const NM = path.join(ROOT, 'node_modules');
const INDEXING = process.env.INDEXING !== 'off';
const BASE = process.env.BASE_PATH || '/';
const TODAY = new Date().toISOString().slice(0, 10);

const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
const copyDir = (from, to, filter = () => true) => {
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b, filter); else if (filter(a)) copy(a, b);
  }
};
const write = (rel, content) => { const f = path.join(DIST, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// ---- assets ----
copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));
const V = path.join(DIST, 'assets', 'vendor');
copy(path.join(NM, 'pdf-lib/dist/pdf-lib.esm.min.js'), path.join(V, 'pdf-lib.esm.min.js'));
copy(path.join(NM, 'pdfjs-dist/legacy/build/pdf.min.mjs'), path.join(V, 'pdfjs/pdf.min.mjs'));
copy(path.join(NM, 'pdfjs-dist/legacy/build/pdf.worker.min.mjs'), path.join(V, 'pdfjs/pdf.worker.min.mjs'));
copyDir(path.join(NM, 'pdfjs-dist/standard_fonts'), path.join(V, 'pdfjs/standard_fonts'));
copyDir(path.join(NM, 'pdfjs-dist/cmaps'), path.join(V, 'pdfjs/cmaps'));
copy(path.join(NM, 'fflate/esm/browser.js'), path.join(V, 'fflate.js'));
copy(path.join(NM, 'sortablejs/modular/sortable.esm.js'), path.join(V, 'sortable.esm.js'));
for (const w of [400, 500, 600, 700, 800]) copy(path.join(NM, `@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-${w}-normal.woff2`), path.join(DIST, 'assets/fonts', `pjs-${w}.woff2`));
// Licences of bundled libraries travel with them.
copy(path.join(NM, 'pdf-lib/LICENSE.md'), path.join(V, 'LICENSE-pdf-lib.md'));
copy(path.join(NM, 'pdfjs-dist/LICENSE'), path.join(V, 'LICENSE-pdfjs.txt'));
copy(path.join(NM, 'fflate/LICENSE'), path.join(V, 'LICENSE-fflate.txt'));
copy(path.join(NM, 'sortablejs/LICENSE'), path.join(V, 'LICENSE-sortablejs.txt'));
copy(path.join(NM, '@fontsource/plus-jakarta-sans/LICENSE'), path.join(DIST, 'assets/fonts/LICENSE-OFL.txt'));

const assetFiles = walk(path.join(DIST, 'assets')).filter((f) => !f.includes(`${path.sep}cmaps${path.sep}`));
const hash = crypto.createHash('sha256');
for (const f of assetFiles.sort()) hash.update(fs.readFileSync(f));
const assetV = hash.digest('hex').slice(0, 10);

// ---- pages ----
const pages = [];
const emit = (def, rel, file) => {
  const html = layout({ ...def, rel, assetV, indexing: INDEXING && !def.noindex });
  write(file, html);
  pages.push({ file, path: def.page.path, noindex: !!def.noindex });
};
emit(homePage('./'), './', 'index.html');
emit(toolsPage('../'), '../', 'tools/index.html');
for (const tp of TOOL_PAGES) emit(toolPage(tp), '../', `${tp.slug}/index.html`);
emit(examPage('../'), '../', 'exam-forms/index.html');
emit(guidePage('../'), '../', 'help-me-choose/index.html');
emit(recentPage('../'), '../', 'recent/index.html');
emit(privacyPage('../'), '../', 'privacy/index.html');
emit(termsPage('../'), '../', 'terms/index.html');
emit(notFoundPage(BASE), BASE, '404.html');

// ---- PWA ----
write('manifest.webmanifest', JSON.stringify({
  name: 'FriendsPDF – Free PDF tools', short_name: 'FriendsPDF', description: SITE.tagline,
  start_url: './', scope: './', display: 'standalone', background_color: '#FFFFFF', theme_color: SITE.themeColor, lang: 'en-IN',
  icons: [
    { src: 'assets/img/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'assets/img/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'assets/img/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ],
  shortcuts: [
    { name: 'JPG to PDF', url: './jpg-to-pdf/' }, { name: 'Compress PDF to KB', url: './compress-pdf-to-kb/' }, { name: 'Merge PDF', url: './merge-pdf/' }
  ]
}, null, 2));

const precache = [
  ...pages.filter((p) => p.file !== '404.html').map((p) => p.path || './'),
  ...walk(path.join(DIST, 'assets')).map((f) => path.relative(DIST, f).split(path.sep).join('/'))
    .filter((f) => !f.startsWith('assets/vendor/') && !/LICENSE/.test(f) && !f.endsWith('og.png')),
  'manifest.webmanifest', 'favicon.ico'
];
write('sw.js', `// FriendsPDF service worker: makes every tool work offline after the first visit.
const VERSION = '${assetV}';
const CACHE = 'fp-' + VERSION;
const PRECACHE = ${JSON.stringify(precache)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('fp-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Network first so updates appear quickly; cached page when offline.
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match(new URL('./', self.registration.scope).href))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && (url.pathname.includes('/cmaps/') || url.pathname.includes('/assets/'))) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
`);

// ---- SEO files ----
const indexable = pages.filter((p) => !p.noindex && p.file !== '404.html');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${SITE.url}/${p.path}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}
</urlset>
`);
write('robots.txt', INDEXING ? `User-agent: *\nAllow: /\nDisallow: /recent/\n\nSitemap: ${SITE.url}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
copy(path.join(SRC, 'assets/img/favicon.ico'), path.join(DIST, 'favicon.ico'));
write('.nojekyll', '');
// Security headers for Cloudflare Pages / Netlify (GitHub Pages ignores this file).
write('_headers', `/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; connect-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(), geolocation=()
  X-Frame-Options: DENY
/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/assets/*
  Cache-Control: public, max-age=3600
/sw.js
  Cache-Control: no-cache
`);

console.log(`Built ${pages.length} pages · assets v${assetV} · indexing ${INDEXING ? 'on' : 'OFF'} · 404 base ${BASE}`);
