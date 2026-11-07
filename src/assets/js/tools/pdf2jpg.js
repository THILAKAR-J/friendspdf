// PDF pages to JPG images (single JPG or ZIP).
import { el, SVG, baseName, safeName, formatRanges, nextFrame, UserError } from '../lib/util.js';
import { renderPage, freeCanvas } from '../lib/pdf.js';
import { canvasToBlob } from '../lib/images.js';
import { loadSinglePdf, lazyThumbs, placeholder } from '../lib/pages.js';
import { createWorkspace, seg, nameField, errorText, showDone } from '../lib/ws.js';
import { zipSync } from '../../vendor/fflate.js';

const DPI = { normal: 150, high: 220 };

export async function start(app, files) {
  const pdf = await loadSinglePdf(files);
  const { n } = pdf;
  const sel = new Set([...Array(n).keys()]);
  const o = { quality: 'normal' };
  const ws = createWorkspace(app, { cta: 'Convert to JPG', onCta: build });
  const grid = el('ol', { class: 'thumbs', 'aria-label': 'Pages' });
  ws.main.append(el('div', { class: 'ws-bar' }, [el('h2', { class: 'h3', text: `${pdf.file.name} · ${n} ${n === 1 ? 'page' : 'pages'}` }), el('div', { class: 'acts' }, [
    el('button', { type: 'button', class: 'btn btn-outline', on: { click: () => { for (let i = 0; i < n; i++) sel.add(i); paint(); } } }, ['Select all']),
    el('button', { type: 'button', class: 'link-btn', on: { click: () => { sel.clear(); paint(); } } }, ['Clear'])
  ])]), grid);
  const thumbs = lazyThumbs(pdf.view, n, (i) => grid.children[i]?.querySelector('.thumb'));
  const cards = [];
  for (let i = 0; i < n; i++) {
    const card = el('li', { class: 'thumb-card selected' }, [
      el('button', { type: 'button', class: 'thumb', 'aria-pressed': 'true', 'aria-label': `Page ${i + 1}`, on: { click: () => { sel.has(i) ? sel.delete(i) : sel.add(i); paint(); } } }, [el('span', { class: 'num', text: i + 1 }), el('span', { class: 'check', html: SVG.check }), placeholder()]),
      el('div', { class: 'tname center', text: `Page ${i + 1}` })
    ]);
    cards.push(card);
    grid.append(card);
    thumbs.observe(i, card.querySelector('.thumb'));
  }
  ws.addSetting(seg('Image quality', [['normal', 'Normal (150 dpi)'], ['high', 'High (220 dpi)']], o.quality, (v) => { o.quality = v; }, 'two'));
  const fname = nameField(baseName(pdf.file.name), 'jpg');
  ws.addSetting(fname.node);
  ws.setHint('Tap pages to leave them out');

  function paint() {
    cards.forEach((c, i) => { const on = sel.has(i); c.classList.toggle('selected', on); c.classList.toggle('off', !on); c.querySelector('.thumb').setAttribute('aria-pressed', String(on)); });
    const k = sel.size;
    ws.setCta(k ? `Convert ${k} ${k === 1 ? 'page' : 'pages'} to JPG` : 'Select pages first');
  }
  paint();

  async function build() {
    if (ws.busy) return;
    if (!sel.size) { ws.alert('Select at least one page.', 'warn'); return; }
    ws.alert('');
    ws.setBusy(true, 'Converting…');
    const idx = [...sel].sort((a, b) => a - b);
    const base = safeName(fname.get(), 'jpg', 'page').replace(/\.jpg$/, '');
    try {
      const out = [];
      for (let k = 0; k < idx.length; k++) {
        const c = await renderPage(pdf.view, idx[k] + 1, { scale: DPI[o.quality] / 72, maxPixels: 14e6 });
        const blob = await canvasToBlob(c, 'image/jpeg', 0.9);
        freeCanvas(c);
        out.push({ blob, name: idx.length === 1 ? `${base}.jpg` : `${base}-page-${idx[k] + 1}.jpg` });
        ws.setProgress(k + 1, idx.length);
        await nextFrame();
      }
      const prev = el('img', { src: URL.createObjectURL(out[0].blob), alt: '' });
      if (out.length === 1) {
        showDone(ws, { blob: out[0].blob, name: out[0].name, kind: 'jpg', preview: prev, title: 'Your image is ready!', next: ['resize-image-to-kb', 'jpg-to-pdf'] });
      } else {
        const entries = {};
        for (const f of out) entries[f.name] = [new Uint8Array(await f.blob.arrayBuffer()), { level: 0 }];
        const zip = zipSync(entries);
        if (!zip.length) throw new UserError('Could not build the ZIP file.');
        showDone(ws, { blob: new Blob([zip], { type: 'application/zip' }), name: `${base}-images.zip`, kind: 'zip', pages: out.length, files: out, preview: prev, title: `${out.length} images are ready!`, sub: `Pages ${formatRanges(idx)}. Download all as a ZIP, or one by one below.`, next: ['resize-image-to-kb', 'jpg-to-pdf'] });
      }
    } catch (e) {
      ws.alert(errorText(e));
    } finally {
      ws.setBusy(false);
      paint();
    }
  }
}
