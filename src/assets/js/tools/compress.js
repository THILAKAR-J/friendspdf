// Compress PDF, optionally to an exact KB limit.
import { el, SVG, fmtBytes, fmtKB, baseName, safeName } from '../lib/util.js';
import { openForRender, renderPage } from '../lib/pdf.js';
import { loadSinglePdf } from '../lib/pages.js';
import { compressPdf } from '../lib/compress.js';
import { createWorkspace, optRow, nameField, errorText, showDone } from '../lib/ws.js';

const SIZES = [50, 100, 200, 300, 500];

export async function start(app, files, preset = {}) {
  const pdf = await loadSinglePdf(files);
  const { n } = pdf;
  const before = pdf.bytes.length;
  pdf.view.destroy();
  const auto = preset.target === 'auto';
  const o = { target: auto ? 'auto' : (preset.target || 100), custom: SIZES.includes(preset.target) || auto ? 150 : preset.target, gray: false };
  if (!auto && !SIZES.includes(o.target)) o.target = 'custom';
  const ws = createWorkspace(app, { cta: 'Compress', onCta: build, ctaClass: 'btn-ok' });

  const card = el('div', { class: 'file-card' }, [el('span', { class: 'fi', text: 'PDF', 'aria-hidden': 'true' }), el('div', { class: 'meta' }, [el('strong', { text: pdf.file.name }), el('small', { text: `${n} ${n === 1 ? 'page' : 'pages'} · ${fmtBytes(before)}` })])]);
  const sizeBtns = [];
  const mk = (v, label) => { const b = el('button', { type: 'button', 'aria-pressed': 'false', on: { click: () => { o.target = v; paint(); if (v === 'custom') customIn.focus(); } } }, [label]); sizeBtns.push([v, b]); return b; };
  const sizes = el('div', { class: 'sizes', role: 'group', 'aria-label': 'Target size' }, [
    ...(auto ? [mk('auto', 'Recommended')] : []),
    ...SIZES.map((s) => mk(s, s + ' KB')),
    mk('custom', 'Custom')
  ]);
  const customIn = el('input', { type: 'number', min: '5', max: '50000', value: String(o.custom), inputmode: 'numeric', id: 'kb-custom', on: { input: () => { o.custom = Math.max(5, parseInt(customIn.value, 10) || 0); o.target = 'custom'; paint(); } } });
  const customRow = el('div', { class: 'inline-input' }, [el('label', { for: 'kb-custom', text: 'Size in KB' }), customIn]);
  const shortcuts = el('div', { class: 'chips' }, [['SSC certificate · 100 KB', 100], ['State PSC marksheet · 200 KB', 200], ['UPSC ID proof · 300 KB', 300]].map(([l, v]) => el('button', { type: 'button', class: 'chip chip-violet', on: { click: () => { o.target = v; paint(); } } }, [l])));
  const already = el('p', { class: 'alert info', hidden: true });
  ws.main.append(
    card,
    el('div', { class: 'card pad' }, [el('h2', { class: 'h3', text: 'Target size' }), sizes, customRow, already]),
    el('div', { class: 'card pad' }, [el('span', { class: 'field-label', text: 'Exam shortcuts' }), shortcuts]),
    el('div', { class: 'card pad' }, [optRow('Black and white', 'Best for scanned marksheets: much smaller, still sharp', false, (v) => { o.gray = v; paint(); })])
  );
  ws.addSetting(el('div', { class: 'note ok' }, [el('span', { html: SVG.check }), el('span', {}, [el('strong', { text: 'Never over your limit' }), 'We show the exact size before you download.'])]));
  const fname = nameField(baseName(pdf.file.name) + '-compressed');
  ws.addSetting(fname.node);
  ws.setHint('Pick the size your form allows');

  const targetKB = () => (o.target === 'auto' ? null : o.target === 'custom' ? o.custom : o.target);
  function paint() {
    for (const [v, b] of sizeBtns) b.setAttribute('aria-pressed', String(v === o.target));
    customRow.hidden = o.target !== 'custom';
    const kb = targetKB();
    already.hidden = !(kb && before <= kb * 1000 && !o.gray);
    already.textContent = `This PDF is already ${fmtKB(before)}, under ${kb} KB. You can download it as it is.`;
    ws.setCta(kb ? `Compress to ${kb} KB` : 'Compress PDF');
  }
  paint();

  async function build() {
    if (ws.busy) return;
    const kb = targetKB();
    if (o.target === 'custom' && (!kb || kb < 5)) { ws.alert('Type a size of at least 5 KB.', 'warn'); return; }
    ws.alert('');
    ws.setBusy(true, 'Compressing…');
    try {
      // Use 1000-byte KB so the file is under the limit whether the portal counts 1000 or 1024 bytes per KB.
      const r = await compressPdf(pdf.bytes, { targetBytes: kb ? kb * 1000 : null, gray: o.gray, onProgress: (d, t) => ws.setProgress(d, t) });
      const blob = new Blob([r.bytes], { type: 'application/pdf' });
      const fits = !kb || r.bytes.length <= kb * 1000;
      const ba = el('div', { class: 'result-card' + (r.soft || !fits ? ' soft' : '') }, [
        el('div', { class: 'ba' }, [
          el('div', {}, [el('small', { text: 'Before' }), el('span', { class: 'before', text: fmtBytes(before) })]),
          el('span', { html: SVG.arrowR }),
          el('div', { class: 'right' }, [el('small', { text: 'After' }), el('span', { class: 'after', text: fmtKB(r.bytes.length) })])
        ]),
        el('p', { class: 'result-note', text: noteText(r, kb, fits, before) })
      ]);
      const previews = el('div', { class: 'page-previews' });
      const after = el('section', { class: 'sec-sm' }, [el('h2', { class: 'h3', text: 'Check it is still readable' }), previews, el('p', { class: 'small muted', text: 'Tap a page to zoom in.' }),
        el('details', { class: 'faq' }, [el('summary', { text: 'Text looks blurry?' }), el('p', { text: 'Pick a bigger size if your form allows it, turn on Black and white, or keep only the pages you need with Split PDF.' })])]);
      showDone(ws, { blob, name: safeName(fname.get(), 'pdf', 'compressed'), kind: 'pdf', pages: n, title: fits ? 'Your PDF is ready!' : 'This is the smallest we could make it', sub: fits ? (kb ? `Under ${kb} KB. Ready to upload.` : 'Smaller and ready to share.') : `It is still over ${kb} KB. Try Black and white, or remove pages with Split PDF.`, extra: ba, after, noCompressHint: true, next: ['split-pdf', 'merge-pdf', 'resize-image-to-kb', 'pdf-to-jpg'] });
      fillPreviews(r.bytes, previews);
    } catch (e) {
      ws.alert(errorText(e));
    } finally {
      ws.setBusy(false);
      paint();
    }
  }
}

function noteText(r, kb, fits, before) {
  if (r.method === 'original') return kb ? `Already under ${kb} KB, so we kept your original file.` : 'This PDF is already well compressed. We kept the original.';
  if (!fits) return `Smallest possible: ${fmtKB(r.bytes.length)}. Remove pages or use Black and white to go lower.`;
  const saved = Math.max(0, Math.round((1 - r.bytes.length / before) * 100));
  if (r.soft) return `Under ${kb} KB, but small text may look soft. Zoom in to check.`;
  return kb ? `Under ${kb} KB. Ready to upload. ${saved}% smaller.` : `${saved}% smaller.`;
}

async function fillPreviews(bytes, box) {
  try {
    const doc = await openForRender(bytes);
    const count = Math.min(3, doc.numPages);
    for (let i = 1; i <= count; i++) {
      const c = await renderPage(doc, i, { maxSide: 360 });
      c.setAttribute('role', 'button');
      c.setAttribute('tabindex', '0');
      c.setAttribute('aria-label', `Zoom page ${i}`);
      const open = () => zoom(bytes, i);
      c.addEventListener('click', open);
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      box.append(c);
    }
    doc.destroy();
  } catch { /* previews are optional */ }
}

async function zoom(bytes, pageNo) {
  const dlg = el('dialog', { class: 'zoom', 'aria-label': `Page ${pageNo}` });
  const close = el('button', { type: 'button', class: 'btn btn-light', on: { click: () => dlg.close() } }, ['Close']);
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
  try {
    const doc = await openForRender(bytes);
    const c = await renderPage(doc, pageNo, { maxSide: Math.min(1600, Math.max(window.innerWidth, window.innerHeight) * 1.5) });
    doc.destroy();
    const img = el('img', { src: c.toDataURL('image/png'), alt: `Page ${pageNo} preview` });
    dlg.append(img, close);
  } catch { dlg.append(close); }
}
