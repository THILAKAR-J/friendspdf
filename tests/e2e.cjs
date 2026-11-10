// End-to-end tests: real files through every tool, output verification, SEO, layout, offline, privacy.
// Run: npm run build && PORT=8080 node scripts/serve.mjs & NODE_PATH=$(npm root -g) node tests/e2e.cjs
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE = process.env.BASE_URL || 'http://localhost:8080/';
const FX = path.join(__dirname, 'fixtures');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-'));
const fx = (n) => path.join(FX, n);
const results = [];
const problems = [];
let browser;

async function lib() {
  const pdfLib = await import(path.join(__dirname, '../node_modules/pdf-lib/es/index.js')).catch(() => require('pdf-lib'));
  const pdfjs = await import(path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.mjs'));
  const fflate = require(path.join(__dirname, '../node_modules/fflate'));
  return { pdfLib, pdfjs, fflate };
}
let L;

async function test(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push(['PASS', name, Date.now() - t0]); }
  catch (e) { results.push(['FAIL', name, Date.now() - t0, e.message.slice(0, 1500)]); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  page._errors = [];
  page.on('console', (m) => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', (e) => page._errors.push('PAGEERR ' + e.message));
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && !u.protocol.startsWith('blob') && !u.protocol.startsWith('data')) problems.push(`external request ${r.url()}`);
    if (r.method() !== 'GET') problems.push(`non-GET ${r.method()} ${r.url()}`);
  });
  return { ctx, page };
}
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf', txt: 'text/plain', heic: 'image/heic' };
// Buffers, because Playwright silently drops paths with non-ASCII names.
const payload = (p) => { const name = path.basename(p); return { name, mimeType: MIME[name.split('.').pop().toLowerCase()] || '', buffer: fs.readFileSync(p) }; };
async function pick(page, files) {
  await page.setInputFiles('#app input[data-pick]:not([capture])', files.map((f) => payload(fx(f))));
  await page.waitForSelector('.ws-wrap', { timeout: 30000 });
}
async function cta(page) {
  const side = page.locator('.side-cta');
  if (await side.isVisible()) await side.click(); else await page.locator('.actionbar .btn').click();
}
async function runAndDownload(page, timeout = 120000) {
  await cta(page);
  await page.waitForSelector('.ws-result:not([hidden]) [data-download]', { timeout });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-download]')]);
  const file = path.join(OUT, Date.now() + '-' + dl.suggestedFilename());
  await dl.saveAs(file);
  return { file, name: dl.suggestedFilename(), bytes: fs.readFileSync(file) };
}
async function pdfInfo(bytes) {
  const doc = await L.pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const vp = p.getViewport({ scale: 1 });
    const tc = await p.getTextContent();
    const items = tc.items.map((it) => { const t = L.pdfjs.Util.transform(vp.transform, it.transform); return { str: it.str, x: t[4], y: t[5] }; });
    pages.push({ w: vp.width, h: vp.height, rotate: p.rotate, text: tc.items.map((x) => x.str).join(' '), items });
  }
  return { n: doc.numPages, pages };
}
const noErrors = (page) => assert(!page._errors.length, 'console errors: ' + page._errors.slice(0, 3).join(' | '));

(async () => {
  L = await lib();
  browser = await chromium.launch();

  // ---------------- tools ----------------
  await test('JPG to PDF: 6 mixed images, reorder, rotate, EXIF, Tamil name', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'jpg-to-pdf/');
    await pick(page, ['a_portrait.jpg', 'b_landscape.png', 'c_square.webp', 'd_big.jpg', 'e_exif6.jpg', 'படம் ஒன்று.jpg']);
    assert((await page.locator('.thumb-card').count()) === 6, 'expected 6 thumbs');
    assert(/Create PDF \(6 pages\)/.test(await page.locator('.side-cta').textContent()), 'cta text');
    await page.locator('.thumb-card').nth(0).getByRole('button', { name: /Move later/ }).click();
    await page.locator('.thumb-card').nth(0).getByRole('button', { name: /Rotate/ }).click(); // b_landscape now first, rotated 90
    const r = await runAndDownload(page);
    assert(r.name === 'a_portrait.pdf', 'file name ' + r.name);
    const info = await pdfInfo(r.bytes);
    assert(info.n === 6, 'pages ' + info.n);
    assert(info.pages.every((p) => Math.abs(p.w - 595.28) < 1 || Math.abs(p.w - 841.89) < 1), 'A4 sizes');
    assert(info.pages[0].h > info.pages[0].w, 'rotated landscape image should be on a portrait page');
    assert(info.pages[4].h > info.pages[4].w, 'EXIF-rotated photo should be portrait');
    assert(info.pages[3].w > info.pages[3].h, 'big landscape photo on landscape page');
    noErrors(page);
    await ctx.close();
  });

  await test('JPG to PDF (mobile): ID card pair + watermark', async () => {
    const { ctx, page } = await newPage({ ...devices['Pixel 7'] });
    await page.goto(BASE + 'jpg-to-pdf/');
    await pick(page, ['a_portrait.jpg', 'e_exif6.jpg']);
    await page.getByText('ID card: 2 images per page').click();
    await page.getByText('Add watermark', { exact: true }).click();
    await page.fill('input[aria-label="Watermark text"]', 'Only for bank KYC');
    assert(/1 page/.test(await page.locator('.actionbar .btn').textContent()), 'pair should make 1 page');
    const r = await runAndDownload(page);
    const info = await pdfInfo(r.bytes);
    assert(info.n === 1, 'pages ' + info.n);
    assert(info.pages[0].text.includes('Only for bank KYC'), 'watermark text missing');
    noErrors(page);
    await ctx.close();
  });

  await test('PNG to PDF: high quality keeps PNG', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'png-to-pdf/');
    await pick(page, ['b_landscape.png']);
    await page.getByRole('button', { name: 'High', exact: true }).click();
    const r = await runAndDownload(page);
    assert((await pdfInfo(r.bytes)).n === 1, '1 page');
    assert(r.bytes.includes(Buffer.from('/FlateDecode')), 'PNG should be embedded losslessly');
    await ctx.close();
  });

  await test('JPG to PDF: non-images skipped, unreadable HEIC explained', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'jpg-to-pdf/');
    fs.writeFileSync(path.join(OUT, 'IMG_0001.heic'), Buffer.from('not really heic'));
    await page.setInputFiles('#app input[data-pick]:not([capture])', [fx('notes.txt'), fx('a_portrait.jpg'), path.join(OUT, 'IMG_0001.heic')].map(payload));
    await page.waitForSelector('.ws-wrap');
    assert((await page.locator('.alert').first().textContent()).includes('skipped'), 'skip warning');
    await cta(page);
    await page.waitForSelector('.alert.err', { timeout: 20000 });
    assert(/HEIC/.test(await page.locator('.alert.err').textContent()), 'HEIC message');
    await ctx.close();
  });

  await test('PDF to JPG: 2 of 3 pages -> ZIP with 2 JPGs', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'pdf-to-jpg/');
    await pick(page, ['text3.pdf']);
    await page.getByRole('button', { name: 'Page 2', exact: true }).click();
    const r = await runAndDownload(page);
    assert(r.name.endsWith('.zip'), 'zip name ' + r.name);
    const files = L.fflate.unzipSync(new Uint8Array(r.bytes));
    const names = Object.keys(files);
    assert(names.length === 2 && names.every((n) => n.endsWith('.jpg')), 'zip entries ' + names);
    assert(names.some((n) => n.includes('page-3')), 'page 3 present');
    for (const n of names) assert(files[n][0] === 0xff && files[n][1] === 0xd8, 'jpeg header');
    noErrors(page);
    await ctx.close();
  });

  await test('Merge: image moved first + 2 PDFs = 6 pages in order', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'merge-pdf/');
    await pick(page, ['text3.pdf', 'text2.pdf', 'a_portrait.jpg']);
    await page.waitForFunction(() => !document.body.textContent.includes('Reading…'));
    await page.locator('.file-row').nth(2).getByRole('button', { name: /Move up/ }).click();
    await page.locator('.file-row').nth(1).getByRole('button', { name: /Move up/ }).click();
    assert((await page.locator('.ws-side').textContent()).includes('3 files · 6 pages'), 'summary');
    const r = await runAndDownload(page);
    const info = await pdfInfo(r.bytes);
    assert(info.n === 6, 'pages ' + info.n);
    assert(!info.pages[0].text.trim(), 'page 1 should be the photo');
    assert(info.pages[1].text.includes('Alpha page 1') && info.pages[4].text.includes('Beta page 1'), 'order');
    noErrors(page);
    await ctx.close();
  });

  await test('Split: range "1,3" -> one PDF; each page -> ZIP', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'split-pdf/');
    await pick(page, ['text3.pdf']);
    await page.fill('input[aria-label="Pages to keep"]', '1,3');
    let r = await runAndDownload(page);
    let info = await pdfInfo(r.bytes);
    assert(info.n === 2 && info.pages[1].text.includes('Alpha page 3'), 'split one');
    await page.getByRole('button', { name: 'Edit again' }).click();
    await page.getByRole('button', { name: 'Each page separately (ZIP)' }).click();
    r = await runAndDownload(page);
    const files = L.fflate.unzipSync(new Uint8Array(r.bytes));
    assert(Object.keys(files).length === 2, 'zip of 2');
    noErrors(page);
    await ctx.close();
  });

  await test('Split: 40-page PDF, select all, extract', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'split-pdf/');
    await pick(page, ['many40.pdf']);
    await page.getByRole('button', { name: 'Select all' }).click();
    const r = await runAndDownload(page);
    assert((await pdfInfo(r.bytes)).n === 40, '40 pages');
    await ctx.close();
  });

  await test('Rotate: page 1 right, page 2 (already 90) right -> 90 / 180', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'rotate-pdf/');
    await pick(page, ['rotated.pdf']);
    await page.getByRole('button', { name: 'Rotate page 1 right' }).click();
    await page.getByRole('button', { name: 'Rotate page 2 right' }).click();
    const r = await runAndDownload(page);
    const info = await pdfInfo(r.bytes);
    assert(info.pages[0].rotate === 90 && info.pages[1].rotate === 180 && info.pages[2].rotate === 0, 'rotations ' + info.pages.map((p) => p.rotate));
    assert(info.pages[0].text.includes('Gamma page 1'), 'text kept (lossless)');
    await ctx.close();
  });

  await test('Page numbers: "Page X of N" bottom centre, also on a rotated page', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'add-page-numbers/');
    await pick(page, ['rotated.pdf']);
    await page.getByRole('button', { name: 'Page 1 of N' }).click();
    const r = await runAndDownload(page);
    const info = await pdfInfo(r.bytes);
    for (let i = 0; i < 3; i++) {
      const it = info.pages[i].items.find((x) => x.str === `Page ${i + 1} of 3`);
      assert(it, `label missing on page ${i + 1}`);
      const { w, h } = info.pages[i];
      assert(it.y > h * 0.9, `page ${i + 1}: number not at bottom (y=${it.y.toFixed(0)} of ${h.toFixed(0)})`);
      assert(Math.abs(it.x + 30 - w / 2) < w * 0.15, `page ${i + 1}: number not centred (x=${it.x.toFixed(0)} of ${w.toFixed(0)})`);
    }
    noErrors(page);
    await ctx.close();
  });

  await test('Watermark: text on every page', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'add-watermark/');
    await pick(page, ['text3.pdf']);
    await page.fill('#wm-text', 'Only for bank KYC, 08 Nov 2026');
    const r = await runAndDownload(page);
    const info = await pdfInfo(r.bytes);
    assert(info.pages.every((p) => p.text.includes('Only for bank KYC')), 'watermark on all pages');
    await ctx.close();
  });

  for (const kb of [100, 50]) {
    await test(`Compress scanned 2.8 MB PDF to ${kb} KB`, async () => {
      const { ctx, page } = await newPage();
      await page.goto(BASE + `compress-pdf-to-${kb}kb/`);
      await pick(page, ['scanned3.pdf']);
      assert((await page.locator('.side-cta').textContent()).includes(`${kb} KB`), 'preset target');
      const r = await runAndDownload(page, 180000);
      assert(r.bytes.length <= kb * 1000, `size ${r.bytes.length} > ${kb * 1000}`);
      const info = await pdfInfo(r.bytes);
      assert(info.n === 3, 'pages kept');
      console.log(`   ${kb} KB target -> ${r.bytes.length} bytes`);
      noErrors(page);
      await ctx.close();
    });
  }

  await test('Compress: custom 150 KB via ?target=150 and black & white', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'compress-pdf-to-kb/?target=150');
    await pick(page, ['scanned1.pdf']);
    assert((await page.locator('.side-cta').textContent()).includes('150 KB'), 'custom target from URL');
    await page.locator('.opt-row', { hasText: 'Black and white' }).locator('input').check();
    const r = await runAndDownload(page, 180000);
    assert(r.bytes.length <= 150000, 'size ' + r.bytes.length);
    await ctx.close();
  });

  await test('Compress: already-small PDF is kept as is', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'compress-pdf-to-kb/');
    await pick(page, ['text3.pdf']);
    assert(await page.locator('.alert.info').isVisible(), 'already-under note');
    const r = await runAndDownload(page);
    assert(fs.readFileSync(fx('text3.pdf')).equals(r.bytes), 'original returned');
    await ctx.close();
  });

  await test('Compress PDF (recommended) makes scanned PDF smaller', async () => {
    const { ctx, page } = await newPage({ ...devices['iPhone 13'] });
    await page.goto(BASE + 'compress-pdf/');
    await pick(page, ['scanned3.pdf']);
    const r = await runAndDownload(page, 180000);
    assert(r.bytes.length < 2817855 * 0.6, 'not much smaller: ' + r.bytes.length);
    await ctx.close();
  });

  await test('Resize photo 8.7 MB -> 20-50 KB JPG', async () => {
    const { ctx, page } = await newPage({ ...devices['Pixel 7'] });
    await page.goto(BASE + 'resize-image-to-kb/');
    await pick(page, ['photo_noisy.jpg']);
    const r = await runAndDownload(page, 120000);
    assert(r.bytes.length >= 20000 && r.bytes.length <= 50000, 'size ' + r.bytes.length);
    assert(r.bytes[0] === 0xff && r.bytes[1] === 0xd8, 'jpeg');
    console.log(`   photo -> ${r.bytes.length} bytes`);
    noErrors(page);
    await ctx.close();
  });

  await test('Signature resize -> 10-20 KB, clean background', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'signature-resize/');
    await pick(page, ['signature.jpg']);
    const r = await runAndDownload(page);
    assert(r.bytes.length >= 10000 && r.bytes.length <= 20000, 'size ' + r.bytes.length);
    console.log(`   signature -> ${r.bytes.length} bytes`);
    await ctx.close();
  });

  await test('Resize to exact 200 x 230 px under 50 KB', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'resize-image-to-50kb/');
    await pick(page, ['a_portrait.jpg']);
    await page.getByText('Exact size in pixels (optional)').click();
    await page.fill('#rs-w', '200');
    await page.fill('#rs-h', '230');
    const r = await runAndDownload(page);
    const dims = await page.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode(); return [img.naturalWidth, img.naturalHeight]; }, r.bytes.toString('base64'));
    assert(dims[0] === 200 && dims[1] === 230, 'dims ' + dims);
    assert(r.bytes.length <= 50000, 'size');
    await ctx.close();
  });

  await test('Errors: password PDF and damaged PDF show friendly messages', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'split-pdf/');
    await page.setInputFiles('#app input[data-pick]', fx('locked.pdf'));
    await page.waitForSelector('#app .alert.err');
    assert(/password/i.test(await page.locator('#app .alert.err').textContent()), 'password msg');
    await page.setInputFiles('#app input[data-pick]', fx('broken.pdf'));
    await page.waitForFunction(() => /damaged/.test(document.querySelector('#app .alert.err')?.textContent || ''));
    await page.setInputFiles('#app input[data-pick]', fx('text2.pdf'));
    await page.waitForSelector('.ws-wrap');
    await ctx.close();
  });

  await test('Recent files: saved after a run, listed, can be cleared', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'rotate-pdf/');
    await pick(page, ['text2.pdf']);
    await page.getByRole('button', { name: 'Rotate page 1 right' }).click();
    await runAndDownload(page);
    await page.goto(BASE + 'recent/');
    await page.waitForSelector('.recent-item');
    assert((await page.locator('.recent-item').first().textContent()).includes('text2-rotated.pdf'), 'listed');
    await page.goto(BASE);
    await page.waitForSelector('[data-recent-strip]:not([hidden]) .recent-item');
    await page.goto(BASE + 'recent/');
    await page.getByRole('button', { name: 'Clear all' }).click();
    await page.waitForSelector('[data-recent-empty]:not([hidden])');
    await ctx.close();
  });

  // ---------------- pages ----------------
  await test('Help me choose: PDF -> smaller -> 100 KB -> compress tool link', async () => {
    const { ctx, page } = await newPage({ ...devices['Pixel 7'] });
    await page.goto(BASE + 'help-me-choose/');
    await page.getByRole('radio', { name: /A PDF file/ }).click();
    await page.click('[data-g-next]');
    await page.getByRole('button', { name: '100 KB' }).click();
    await page.click('[data-g-next]');
    const href = await page.locator('[data-g-go]').getAttribute('href');
    assert(href.endsWith('compress-pdf-to-kb/?target=100'), 'href ' + href);
    await page.click('[data-g-go]');
    await page.waitForURL(/compress-pdf-to-kb/);
    noErrors(page);
    await ctx.close();
  });

  await test('Home: exam tabs, quick-start tabs', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await page.locator('[data-exams]').getByRole('tab', { name: 'UPSC' }).click();
    const vis = page.locator('[data-exams] .exam-panel:not([data-hidden])');
    assert((await vis.textContent()).includes('300 KB'), 'UPSC panel');
    assert((await vis.locator('a').first().getAttribute('href')).includes('compress-pdf-to-kb/?target=300'), 'fix link');
    await page.locator('[data-quick]').getByRole('tab', { name: 'Compress to KB' }).click();
    assert((await page.locator('[data-q-btn]').getAttribute('href')).includes('compress-pdf-to-kb'), 'quick link');
    assert((await page.locator('#home-q').count()) === 0, 'home search bar removed');
    noErrors(page);
    await ctx.close();
  });

  await test('Mobile menu opens and closes', async () => {
    const { ctx, page } = await newPage({ ...devices['iPhone 13'] });
    await page.goto(BASE + 'tools/');
    await page.click('.menu-btn');
    assert(await page.locator('#mobile-menu').isVisible(), 'open');
    await page.keyboard.press('Escape');
    assert(!(await page.locator('#mobile-menu').isVisible()), 'closed');
    await ctx.close();
  });

  await test('Offline: tool works in airplane mode after first visit', async () => {
    const { ctx, page } = await newPage();
    await page.goto(BASE + 'jpg-to-pdf/');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.waitForTimeout(2500); // idle prefetch of PDF.js
    await ctx.setOffline(true);
    await page.reload();
    await pick(page, ['a_portrait.jpg']);
    const r = await runAndDownload(page);
    assert((await pdfInfo(r.bytes)).n === 1, 'offline output');
    await ctx.setOffline(false);
    await ctx.close();
  });

  // ---------------- SEO + layout crawl ----------------
  await test('SEO + layout crawl of every page (3 screen sizes)', async () => {
    const sitemap = await (await fetch(BASE + 'sitemap.xml')).text();
    const urls = [...sitemap.matchAll(/<loc>https:\/\/friendspdf\.com\/(.*?)<\/loc>/g)].map((m) => m[1]);
    assert(urls.length >= 25, 'sitemap urls ' + urls.length);
    const all = [...urls, 'recent/'];
    const titles = new Map(), descs = new Map();
    const linkSet = new Set();
    const issues = [];
    for (const [label, vp] of [['mobile', { width: 390, height: 844 }], ['tablet', { width: 834, height: 1112 }], ['desktop', { width: 1440, height: 900 }]]) {
      const { ctx, page } = await newPage({ viewport: vp, deviceScaleFactor: 1, isMobile: label === 'mobile', hasTouch: label !== 'desktop' });
      for (const u of all) {
        const res = await page.goto(BASE + u, { waitUntil: 'load' });
        if (res.status() !== 200) issues.push(`${u} status ${res.status()}`);
        const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (ov > 0) issues.push(`${label} ${u} horizontal overflow ${ov}px`);
        const small = await page.evaluate(() => [...document.querySelectorAll('a.btn, button, .tab-bar a, .chip, input[type=checkbox], .site-footer nav a')].filter((e) => { const r = (e.closest('label') || e).getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && (r.height < 30 || r.width < 22); }).map((e) => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30)));
        if (label === 'mobile' && small.length) issues.push(`${u} small tap targets: ${small.slice(0, 4).join(', ')}`);
        if (label === 'desktop') {
          const m = await page.evaluate(() => ({
            title: document.title, desc: document.querySelector('meta[name=description]')?.content || '',
            canonical: document.querySelector('link[rel=canonical]')?.href, h1: document.querySelectorAll('h1').length, lang: document.documentElement.lang,
            robots: document.querySelector('meta[name=robots]')?.content, og: !!document.querySelector('meta[property="og:title"]') && !!document.querySelector('meta[property="og:image"]'),
            ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { JSON.parse(s.textContent); return true; } catch { return false; } }),
            imgsNoAlt: [...document.querySelectorAll('img:not([alt])')].length,
            links: [...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith(location.origin)),
            headingOrder: [...document.querySelectorAll('h1,h2,h3')].map((h) => +h.tagName[1])
          }));
          if (m.title.length < 20 || m.title.length > 65) issues.push(`${u} title length ${m.title.length}: ${m.title}`);
          if (m.desc.length < 70 || m.desc.length > 165) issues.push(`${u} description length ${m.desc.length}`);
          if (titles.has(m.title)) issues.push(`${u} duplicate title with ${titles.get(m.title)}`); titles.set(m.title, u);
          if (descs.has(m.desc)) issues.push(`${u} duplicate description with ${descs.get(m.desc)}`); descs.set(m.desc, u);
          if (m.canonical !== 'https://friendspdf.com/' + u) issues.push(`${u} canonical ${m.canonical}`);
          if (m.h1 !== 1) issues.push(`${u} h1 count ${m.h1}`);
          if (m.lang !== 'en') issues.push(`${u} lang`);
          if (u !== 'recent/' && !/^index/.test(m.robots)) issues.push(`${u} robots ${m.robots}`);
          if (u === 'recent/' && !/noindex/.test(m.robots)) issues.push('recent should be noindex');
          if (!m.og) issues.push(`${u} og tags`);
          if (m.ld.some((x) => !x)) issues.push(`${u} invalid JSON-LD`);
          if (m.imgsNoAlt) issues.push(`${u} img without alt`);
          if (m.headingOrder[0] !== 1) issues.push(`${u} first heading not h1`);
          for (let i = 1; i < m.headingOrder.length; i++) if (m.headingOrder[i] - m.headingOrder[i - 1] > 1) { issues.push(`${u} heading skips level h${m.headingOrder[i - 1]} -> h${m.headingOrder[i]}`); break; }
          m.links.forEach((l) => linkSet.add(l.split('#')[0]));
        }
        if (page._errors.length) { issues.push(`${label} ${u} console: ${page._errors[0]}`); page._errors.length = 0; }
      }
      await ctx.close();
    }
    for (const l of linkSet) { const r = await fetch(l); if (r.status !== 200) issues.push(`broken link ${l} -> ${r.status}`); }
    const r404 = await fetch(BASE + 'no-such-page/');
    if (r404.status !== 404) issues.push('404 status ' + r404.status);
    const robots = await (await fetch(BASE + 'robots.txt')).text();
    if (!/Sitemap: https:\/\/friendspdf\.com\/sitemap\.xml/.test(robots)) issues.push('robots sitemap line');
    assert(!issues.length, issues.length + ' issues:\n    ' + issues.join('\n    '));
  });

  await test('Privacy: no uploads, no third-party requests during all tests', async () => {
    assert(!problems.length, problems.slice(0, 5).join(' | '));
  });

  await browser.close();
  for (const r of results) console.log(r[0] === 'PASS' ? '✅' : '❌', r[1], `(${(r[2] / 1000).toFixed(1)}s)`, r[3] ? '\n   ' + r[3] : '');
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})();
