// Rotate single pages or the whole PDF (lossless: only the page /Rotate value changes).
import { el, SVG, baseName, safeName } from '../lib/util.js';
import { PDFLib, savePdf } from '../lib/pdf.js';
import { loadSinglePdf, lazyThumbs, placeholder } from '../lib/pages.js';
import { createWorkspace, nameField, errorText, showDone } from '../lib/ws.js';
import { firstPagePreview } from './img2pdf.js';

export async function start(app, files) {
  const pdf = await loadSinglePdf(files);
  const { n } = pdf;
  const delta = new Array(n).fill(0);
  const ws = createWorkspace(app, { cta: 'Save rotated PDF', onCta: build });
  const grid = el('ol', { class: 'thumbs', 'aria-label': 'Pages' });
  const all = (d) => { for (let i = 0; i < n; i++) delta[i] = (delta[i] + d + 360) % 360; paint(); };
  ws.main.append(el('div', { class: 'ws-bar' }, [el('h2', { class: 'h3', text: `${pdf.file.name} · ${n} ${n === 1 ? 'page' : 'pages'}` }), el('div', { class: 'acts' }, [
    el('button', { type: 'button', class: 'btn btn-outline', on: { click: () => all(-90) } }, [el('span', { html: SVG.rotL }), 'All left']),
    el('button', { type: 'button', class: 'btn btn-outline', on: { click: () => all(90) } }, [el('span', { html: SVG.rotR }), 'All right']),
    el('button', { type: 'button', class: 'link-btn', on: { click: () => { delta.fill(0); paint(); } } }, ['Reset'])
  ])]), grid);
  const thumbs = lazyThumbs(pdf.view, n, (i) => grid.children[i]?.querySelector('.thumb'));
  const cards = [];
  for (let i = 0; i < n; i++) {
    const card = el('li', { class: 'thumb-card' }, [
      el('div', { class: 'thumb' }, [el('span', { class: 'num', text: i + 1 }), placeholder()]),
      el('div', { class: 'tname center', 'data-label': '' }),
      el('div', { class: 'tbtns two' }, [
        el('button', { type: 'button', 'aria-label': `Rotate page ${i + 1} left`, title: 'Rotate left', html: SVG.rotL, on: { click: () => { delta[i] = (delta[i] + 270) % 360; paint(); } } }),
        el('button', { type: 'button', 'aria-label': `Rotate page ${i + 1} right`, title: 'Rotate right', html: SVG.rotR, on: { click: () => { delta[i] = (delta[i] + 90) % 360; paint(); } } })
      ])
    ]);
    cards.push(card);
    grid.append(card);
    thumbs.observe(i, card.querySelector('.thumb'));
  }
  const fname = nameField(baseName(pdf.file.name) + '-rotated');
  ws.addSetting(el('p', { class: 'small muted', text: 'Rotation is lossless: text and images keep their quality.' }));
  ws.addSetting(fname.node);
  ws.setHint('Rotate the pages that are wrong');

  function paint() {
    cards.forEach((c, i) => {
      const th = c.querySelector('.thumb');
      th.dataset.rot = delta[i];
      c.querySelector('[data-label]').textContent = delta[i] ? `Page ${i + 1} · ${delta[i]}°` : `Page ${i + 1}`;
    });
    const changed = delta.filter(Boolean).length;
    ws.setCta(changed ? `Save rotated PDF (${changed} ${changed === 1 ? 'page' : 'pages'})` : 'Rotate a page first');
  }
  paint();

  async function build() {
    if (ws.busy) return;
    if (!delta.some(Boolean)) { ws.alert('Rotate at least one page first.', 'warn'); return; }
    ws.alert('');
    ws.setBusy(true, 'Saving…');
    try {
      const doc = await PDFLib.PDFDocument.load(pdf.bytes, { updateMetadata: false });
      doc.getPages().forEach((p, i) => { if (delta[i]) p.setRotation(PDFLib.degrees((p.getRotation().angle + delta[i]) % 360)); });
      const bytes = await savePdf(doc);
      showDone(ws, { blob: new Blob([bytes], { type: 'application/pdf' }), name: safeName(fname.get(), 'pdf', 'rotated'), kind: 'pdf', pages: n, preview: await firstPagePreview(bytes), title: 'Your rotated PDF is ready!', next: ['merge-pdf', 'compress-pdf-to-kb', 'add-page-numbers', 'split-pdf'] });
    } catch (e) {
      ws.alert(errorText(e));
    } finally {
      ws.setBusy(false);
      paint();
    }
  }
}
