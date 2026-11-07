// Split PDF: keep chosen pages as one PDF, or save each chosen page as its own PDF (ZIP).
import { el, SVG, baseName, safeName, parseRanges, formatRanges, nextFrame, UserError } from '../lib/util.js';
import { PDFLib, savePdf } from '../lib/pdf.js';
import { loadSinglePdf, lazyThumbs, placeholder } from '../lib/pages.js';
import { createWorkspace, seg, nameField, errorText, showDone } from '../lib/ws.js';
import { firstPagePreview } from './img2pdf.js';
import { zipSync } from '../../vendor/fflate.js';

export async function start(app, files) {
  const pdf = await loadSinglePdf(files);
  const { n } = pdf;
  const sel = new Set();
  const state = { mode: 'one' };
  const ws = createWorkspace(app, { cta: 'Extract pages', onCta: build });
  const range = el('input', { type: 'text', class: 'text-input', inputmode: 'numeric', placeholder: 'e.g. 1-3, 5', 'aria-label': 'Pages to keep', on: { input: () => { sel.clear(); parseRanges(range.value, n).forEach((i) => sel.add(i)); paint(false); } } });
  const grid = el('ol', { class: 'thumbs', 'aria-label': 'Pages' });
  ws.main.append(
    el('div', { class: 'ws-bar' }, [el('h2', { class: 'h3', text: `${pdf.file.name} · ${n} ${n === 1 ? 'page' : 'pages'}` }), el('div', { class: 'acts' }, [
      el('button', { type: 'button', class: 'btn btn-outline', on: { click: () => { for (let i = 0; i < n; i++) sel.add(i); paint(); } } }, ['Select all']),
      el('button', { type: 'button', class: 'link-btn', on: { click: () => { sel.clear(); paint(); } } }, ['Clear'])
    ])]),
    grid
  );
  const thumbs = lazyThumbs(pdf.view, n, (i) => grid.children[i]?.querySelector('.thumb'));
  const cards = [];
  for (let i = 0; i < n; i++) {
    const card = el('li', { class: 'thumb-card off' }, [
      el('button', { type: 'button', class: 'thumb', 'aria-pressed': 'false', 'aria-label': `Page ${i + 1}`, on: { click: () => { sel.has(i) ? sel.delete(i) : sel.add(i); paint(); } } }, [el('span', { class: 'num', text: i + 1 }), el('span', { class: 'check', html: SVG.check }), placeholder()]),
      el('div', { class: 'tname center', text: `Page ${i + 1}` })
    ]);
    cards.push(card);
    grid.append(card);
    thumbs.observe(i, card.querySelector('.thumb'));
  }
  ws.addSetting(el('div', { class: 'field' }, [el('label', { class: 'field-label', text: 'Pages to keep' }), range, el('p', { class: 'small muted', text: 'Tap pages on the left, or type page numbers.' })]));
  ws.addSetting(seg('Save as', [['one', 'One PDF'], ['each', 'Each page separately (ZIP)']], state.mode, (v) => { state.mode = v; paint(false); }, 'two'));
  const fname = nameField(baseName(pdf.file.name) + '-pages');
  ws.addSetting(fname.node);
  ws.setHint('Tap the pages you want to keep');

  function paint(syncText = true) {
    cards.forEach((c, i) => { const on = sel.has(i); c.classList.toggle('selected', on); c.classList.toggle('off', !on); c.querySelector('.thumb').setAttribute('aria-pressed', String(on)); });
    if (syncText) range.value = formatRanges(sel);
    const k = sel.size;
    ws.setCta(k ? (state.mode === 'one' ? `Extract ${k} ${k === 1 ? 'page' : 'pages'}` : `Save ${k} ${k === 1 ? 'PDF' : 'PDFs'} (ZIP)`) : 'Select pages first');
  }
  paint();

  async function build() {
    if (ws.busy) return;
    if (!sel.size) { ws.alert('Tap at least one page to keep.', 'warn'); return; }
    ws.alert('');
    ws.setBusy(true, 'Working…');
    const idx = [...sel].sort((a, b) => a - b);
    try {
      const base = safeName(fname.get(), 'pdf', 'pages').replace(/\.pdf$/, '');
      if (state.mode === 'one') {
        const out = await PDFLib.PDFDocument.create();
        (await out.copyPages(pdf.edit, idx)).forEach((p) => out.addPage(p));
        const bytes = await savePdf(out);
        showDone(ws, { blob: new Blob([bytes], { type: 'application/pdf' }), name: base + '.pdf', kind: 'pdf', pages: idx.length, preview: await firstPagePreview(bytes), title: 'Your pages are ready!', next: ['merge-pdf', 'compress-pdf-to-kb', 'rotate-pdf', 'add-page-numbers'] });
      } else {
        const entries = {};
        const singles = [];
        for (let k = 0; k < idx.length; k++) {
          const out = await PDFLib.PDFDocument.create();
          const [p] = await out.copyPages(pdf.edit, [idx[k]]);
          out.addPage(p);
          const bytes = await savePdf(out);
          const name = `${base}-page-${idx[k] + 1}.pdf`;
          entries[name] = [bytes, { level: 0 }];
          singles.push({ blob: new Blob([bytes], { type: 'application/pdf' }), name });
          ws.setProgress(k + 1, idx.length);
          await nextFrame();
        }
        if (idx.length === 1) {
          showDone(ws, { blob: singles[0].blob, name: singles[0].name, kind: 'pdf', pages: 1, title: 'Your page is ready!', next: ['merge-pdf', 'compress-pdf-to-kb'] });
        } else {
          const zip = zipSync(entries);
          if (!zip.length) throw new UserError('Could not build the ZIP file.');
          showDone(ws, { blob: new Blob([zip], { type: 'application/zip' }), name: base + '.zip', kind: 'zip', pages: idx.length, files: singles, title: `${idx.length} PDFs are ready!`, sub: 'Download them all as one ZIP, or one by one below.', next: ['merge-pdf', 'compress-pdf-to-kb'] });
        }
      }
    } catch (e) {
      ws.alert(errorText(e));
    } finally {
      ws.setBusy(false);
      paint(false);
    }
  }
}
