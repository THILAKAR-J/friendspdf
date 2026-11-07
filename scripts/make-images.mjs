// One-time generator for icons and the social share image. Run: node scripts/make-images.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const svg = fs.readFileSync(root + 'src/assets/img/icon.svg', 'utf8');
const font = fs.readFileSync(root + 'node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff2').toString('base64');
const font5 = fs.readFileSync(root + 'node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-500-normal.woff2').toString('base64');
const b = await chromium.launch();
const p = await b.newPage();
async function shot(html, w, h, out) {
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(`<style>@font-face{font-family:P;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:800}@font-face{font-family:P;src:url(data:font/woff2;base64,${font5}) format("woff2");font-weight:500}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}</style>${html}`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: root + 'src/assets/img/' + out, omitBackground: true });
}
const icon = (s) => `<div style="width:${s}px;height:${s}px">${svg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</div>`;
for (const s of [192, 512]) await shot(icon(s), s, s, `icon-${s}.png`);
await shot(icon(180).replace('rx="15"', 'rx="0"'), 180, 180, 'apple-touch-icon.png');
await shot(icon(32), 32, 32, 'fav-32.png');
await shot(icon(16), 16, 16, 'fav-16.png');
await shot(`<div style="width:512px;height:512px;background:#1D4ED8;display:flex;align-items:center;justify-content:center">${svg.replace('<rect width="64" height="64" rx="15" fill="#1D4ED8"/>', '').replace('<svg ', '<svg width="330" height="330" ')}</div>`, 512, 512, 'icon-maskable-512.png');
await shot(`<div style="width:1200px;height:630px;background:#F4F6FF;font-family:P;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box;color:#141A2E">
<div style="display:flex;align-items:center;gap:22px;font-size:52px;font-weight:800">${svg.replace('<svg ', '<svg width="84" height="84" ')}<span>Friends<span style="color:#1D4ED8">PDF</span></span></div>
<div style="font-size:66px;font-weight:800;line-height:1.08;margin-top:44px;letter-spacing:-1.5px">Free PDF tools.<br><span style="color:#1D4ED8">Right on your phone.</span></div>
<div style="font-size:30px;font-weight:500;color:#535B70;margin-top:30px">JPG to PDF · Compress to KB · Merge · Resize photo for forms</div>
<div style="position:absolute;right:90px;bottom:60px;font-size:26px;font-weight:800;color:#067647">0 bytes uploaded</div></div>`, 1200, 630, 'og.png');
await b.close();
console.log('images done');
