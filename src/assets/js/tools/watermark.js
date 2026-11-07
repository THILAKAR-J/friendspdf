// Add a text watermark to every page.
import { el, baseName, safeName, nextFrame } from '../lib/util.js';
import { PDFLib, savePdf, renderPage } from '../lib/pdf.js';
import { loadSinglePdf } from '../lib/pages.js';
import { drawVisualText, fitSize, COLORS } from '../lib/stamp.js';
import { createWorkspace, seg, nameField, errorText, showDone } from '../lib/ws.js';
import { firstPagePreview } from './img2pdf.js';

const OPACITY = { light: 0.18, medium: 0.32, strong: 0.55 };
const SCALE = { small: 0.55, medium: 0.8, large: 1 };

function today() {
  const d = new Date();
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function start(app, files) {
  const pdf = await loadSinglePdf(files);
  const { n } = pdf;
  const o = { text: `Only for verification, ${today()}`, style: 'diagonal', size: 'medium', opacity: 'medium', color: 'grey' };
  const ws = createWorkspace(app, { cta: 'Add watermark', onCta: build });
  const stage = el('div', { class: 'stamp-stage wm' });
  const marker = el('span', { class: 'stamp-wm' });
  ws.main.append(el('div', { class: 'ws-bar' }, [el('h2', { class: 'h3', text: `${pdf.file.name} · ${n} ${n === 1 ? 'page' : 'pages'}` })]), stage);
  renderPage(pdf.view, 1, { maxSide: 560 }).then((c) => { stage.append(c, marker); }).catch(() => {});

  const text = el('input', { id: 'wm-text', class: 'text-input', type: 'text', maxlength: '80', value: o.text, on: { input: () => { o.text = text.value; paint(); } } });
  ws.addSetting(el('div', { class: 'field' }, [el('label', { class: 'field-label', for: 'wm-text', text: 'Watermark text' }), text, el('p', { class: 'small muted', text: 'Tip: write the purpose and date, like "Only for bank KYC, 08 Nov 2026".' })]));
  ws.addSetting(seg('Style', [['diagonal', 'Diagonal'], ['center', 'Across'], ['bottom-center', 'Bottom']], o.style, (v) => { o.style = v; paint(); }));
  ws.addSetting(seg('Size', [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']], o.size, (v) => { o.size = v; paint(); }));
  ws.addSetting(seg('Strength', [['light', 'Light'], ['medium', 'Medium'], ['strong', 'Strong']], o.opacity, (v) => { o.opacity = v; paint(); }));
  ws.addSetting(seg('Colour', [['grey', 'Grey'], ['red', 'Red'], ['blue', 'Blue']], o.color, (v) => { o.color = v; paint(); }));
  const fname = nameField(baseName(pdf.file.name) + '-watermarked');
  ws.addSetting(fname.node);
  ws.setHint('Preview of page 1');

  function paint() {
    marker.textContent = o.text || ' ';
    Object.assign(marker.dataset, { style: o.style, size: o.size, opacity: o.opacity, color: o.color });
    ws.setCta(o.text.trim() ? 'Add watermark' : 'Type watermark text');
  }
  paint();

  async function build() {
    if (ws.busy) return;
    const t = o.text.trim();
    if (!t) { ws.alert('Type the watermark text first.', 'warn'); text.focus(); return; }
    ws.alert('');
    ws.setBusy(true, 'Adding watermark…');
    try {
      const doc = await PDFLib.PDFDocument.load(pdf.bytes, { updateMetadata: false });
      const font = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const safe = t.replace(/[^\x20-\x7E -ÿ]/g, '');
      if (!safe.trim()) throw new (await import('../lib/util.js')).UserError('Please use English letters and numbers for the watermark text.');
      const pages = doc.getPages();
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const pos = o.style;
        const size = pos === 'bottom-center' ? 12 * (SCALE[o.size] + 0.4) : fitSize(p, font, safe, pos, SCALE[o.size]);
        drawVisualText(p, safe, { font, size, color: COLORS[o.color], opacity: OPACITY[o.opacity], pos, margin: 24 });
        if (i % 20 === 0) { ws.setProgress(i, pages.length); await nextFrame(); }
      }
      const bytes = await savePdf(doc);
      showDone(ws, { blob: new Blob([bytes], { type: 'application/pdf' }), name: safeName(fname.get(), 'pdf', 'watermarked'), kind: 'pdf', pages: n, preview: await firstPagePreview(bytes), title: 'Watermark added!', next: ['compress-pdf-to-kb', 'merge-pdf', 'add-page-numbers'] });
    } catch (e) {
      ws.alert(errorText(e));
    } finally {
      ws.setBusy(false);
      paint();
    }
  }
}
