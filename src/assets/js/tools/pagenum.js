// Add page numbers.
import { el, baseName, safeName, nextFrame } from '../lib/util.js';
import { PDFLib, savePdf, renderPage } from '../lib/pdf.js';
import { loadSinglePdf } from '../lib/pages.js';
import { drawVisualText, COLORS } from '../lib/stamp.js';
import { createWorkspace, seg, optRow, nameField, errorText, showDone } from '../lib/ws.js';
import { firstPagePreview } from './img2pdf.js';

const SIZES = { small: 9, medium: 11, large: 14 };

export function label(fmt, num, total) {
  return fmt === 'page' ? `Page ${num}` : fmt === 'of' ? `${num} of ${total}` : fmt === 'pageof' ? `Page ${num} of ${total}` : String(num);
}

export async function start(app, files) {
  const pdf = await loadSinglePdf(files);
  const { n } = pdf;
  const o = { pos: 'bottom-center', fmt: 'num', size: 'medium', start: 1, skipFirst: false };
  const ws = createWorkspace(app, { cta: 'Add page numbers', onCta: build });
  const stage = el('div', { class: 'stamp-stage' });
  const marker = el('span', { class: 'stamp-marker' });
  ws.main.append(el('div', { class: 'ws-bar' }, [el('h2', { class: 'h3', text: `${pdf.file.name} · ${n} ${n === 1 ? 'page' : 'pages'}` })]), stage);
  renderPage(pdf.view, Math.min(n, o.skipFirst ? 2 : 1), { maxSide: 560 }).then((c) => { stage.append(c, marker); }).catch(() => {});

  ws.addSetting(seg('Position', [['top-left', 'Top left'], ['top-center', 'Top'], ['top-right', 'Top right'], ['bottom-left', 'Bottom left'], ['bottom-center', 'Bottom'], ['bottom-right', 'Bottom right']], o.pos, (v) => { o.pos = v; paint(); }));
  ws.addSetting(seg('Style', [['num', '1'], ['page', 'Page 1'], ['of', '1 of N'], ['pageof', 'Page 1 of N']], o.fmt, (v) => { o.fmt = v; paint(); }, 'four'));
  ws.addSetting(seg('Text size', [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']], o.size, (v) => { o.size = v; paint(); }));
  const startIn = el('input', { type: 'number', min: '0', max: '99999', value: '1', inputmode: 'numeric', id: 'pn-start', on: { input: () => { o.start = Math.max(0, parseInt(startIn.value, 10) || 0); paint(); } } });
  ws.addSetting(el('div', { class: 'field' }, [el('label', { class: 'field-label', for: 'pn-start', text: 'Start at number' }), el('div', { class: 'inline-input' }, [startIn])]));
  ws.addSetting(optRow('Skip the first page', 'No number on the cover page', false, (v) => { o.skipFirst = v; paint(); }));
  const fname = nameField(baseName(pdf.file.name) + '-numbered');
  ws.addSetting(fname.node);
  ws.setHint('Preview shows where the number goes');

  function paint() {
    const total = o.start + (n - (o.skipFirst ? 1 : 0)) - 1;
    marker.textContent = label(o.fmt, o.start, total);
    marker.dataset.pos = o.pos;
    marker.dataset.size = o.size;
  }
  paint();

  async function build() {
    if (ws.busy) return;
    ws.alert('');
    ws.setBusy(true, 'Adding numbers…');
    try {
      const doc = await PDFLib.PDFDocument.load(pdf.bytes, { updateMetadata: false });
      const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      const pages = doc.getPages();
      const counted = n - (o.skipFirst ? 1 : 0);
      const total = o.start + counted - 1;
      for (let i = 0; i < pages.length; i++) {
        if (o.skipFirst && i === 0) continue;
        const num = o.start + i - (o.skipFirst ? 1 : 0);
        drawVisualText(pages[i], label(o.fmt, num, total), { font, size: SIZES[o.size], color: COLORS.black, pos: o.pos });
        if (i % 20 === 0) { ws.setProgress(i, pages.length); await nextFrame(); }
      }
      const bytes = await savePdf(doc);
      showDone(ws, { blob: new Blob([bytes], { type: 'application/pdf' }), name: safeName(fname.get(), 'pdf', 'numbered'), kind: 'pdf', pages: n, preview: await firstPagePreview(bytes), title: 'Page numbers added!', next: ['merge-pdf', 'compress-pdf-to-kb', 'add-watermark', 'split-pdf'] });
    } catch (e) {
      ws.alert(errorText(e));
    } finally {
      ws.setBusy(false);
      ws.setCta('Add page numbers');
    }
  }
}
