// JPG / PNG / WEBP (and HEIC where the browser can read it) to PDF.
import { el, SVG, fmtBytes, isImage, baseName, safeName, nextFrame } from '../lib/util.js';
import { PDFLib, savePdf, renderPage, openForRender } from '../lib/pdf.js';
import { decodeImage, imageToCanvas, canvasToBlob } from '../lib/images.js';
import { layoutPage, layoutPair } from '../lib/layout.js';
import { createWorkspace, seg, optRow, nameField, filePicker, errorText, showDone } from '../lib/ws.js';

const QUALITY = { high: { max: 3508, q: 0.92 }, balanced: { max: 2000, q: 0.8 }, small: { max: 1400, q: 0.62 } };
const MAX_FILES = 200;

export async function start(app, files) {
  const state = { items: [], nextId: 1, o: { pageSize: 'a4', orientation: 'auto', margin: 'small', quality: 'balanced', pair: false, wm: false, wmText: 'Only for verification' } };
  const ws = createWorkspace(app, { hint: '', cta: 'Create PDF', onCta: build });
  const list = el('ol', { class: 'thumbs', 'aria-label': 'Images in page order' });
  const bar = el('div', { class: 'ws-bar' }, [
    el('h2', { class: 'h3', 'data-count': '' }),
    el('div', { class: 'acts' }, [
      el('button', { type: 'button', class: 'btn btn-outline', on: { click: () => picker.open() } }, [el('span', { html: SVG.plus }), 'Add more']),
      el('button', { type: 'button', class: 'link-btn danger', on: { click: () => { state.items = []; render(); } } }, ['Remove all'])
    ])
  ]);
  ws.main.append(bar, list);
  const picker = filePicker('image/*,.heic,.heif', true, (f) => add(f));

  // ----- settings -----
  const pv = el('div', { class: 'pv-page' }, [el('i')]);
  const pvText = el('div', { class: 'pv-text' });
  ws.addSetting(el('div', { class: 'preview-mini' }, [pv, pvText]));
  ws.addSetting(seg('Page size', [['a4', 'A4'], ['letter', 'Letter'], ['fit', 'Fit image']], state.o.pageSize, (v) => set('pageSize', v)));
  ws.addSetting(seg('Orientation', [['auto', 'Auto'], ['portrait', 'Portrait'], ['landscape', 'Landscape']], state.o.orientation, (v) => set('orientation', v)));
  ws.addSetting(seg('Margin', [['none', 'None'], ['small', 'Small'], ['large', 'Large']], state.o.margin, (v) => set('margin', v)));
  ws.addSetting(seg('Quality', [['high', 'High'], ['balanced', 'Balanced'], ['small', 'Small file']], state.o.quality, (v) => set('quality', v)));
  const wmInput = el('input', { class: 'text-input', type: 'text', value: state.o.wmText, maxlength: '80', 'aria-label': 'Watermark text', hidden: true, on: { input: () => { state.o.wmText = wmInput.value; } } });
  ws.addSetting(el('div', {}, [
    el('span', { class: 'field-label', text: 'Privacy and extras' }),
    el('p', { class: 'opt-row' }, [el('span', {}, [el('strong', { text: 'Photo location removed' }), el('small', { text: 'GPS and camera details are always stripped' })]), el('span', { class: 'ok-line', html: SVG.check })]),
    optRow('ID card: 2 images per page', 'Aadhaar front and back together', false, (v) => set('pair', v)),
    optRow('Add watermark', 'e.g. "Only for bank KYC"', false, (v) => { set('wm', v); wmInput.hidden = !v; if (v) wmInput.focus(); }),
    wmInput
  ]));
  const fname = nameField(baseName(files[0] && files[0].name) || 'images');
  ws.addSetting(fname.node);

  function set(k, v) { state.o[k] = v; summary(); }
  function summary() {
    const o = state.o;
    const land = o.orientation === 'landscape';
    pv.classList.toggle('land', land);
    pv.style.padding = { none: '0px', small: '6px', large: '12px' }[o.margin];
    pvText.innerHTML = '';
    pvText.append('Preview', el('strong', { text: `${{ a4: 'A4', letter: 'Letter', fit: 'Fit image' }[o.pageSize]} · ${{ auto: 'Auto', portrait: 'Portrait', landscape: 'Landscape' }[o.orientation]} · ${o.margin === 'none' ? 'No' : o.margin === 'small' ? 'Small' : 'Large'} margin` }));
    const pages = o.pair ? Math.ceil(state.items.length / 2) : state.items.length;
    ws.setCta(`Create PDF (${pages} ${pages === 1 ? 'page' : 'pages'})`);
  }

  function add(newFiles) {
    const imgs = newFiles.filter(isImage);
    const skipped = newFiles.length - imgs.length;
    for (const f of imgs.slice(0, MAX_FILES - state.items.length)) state.items.push({ id: state.nextId++, file: f, url: URL.createObjectURL(f), rot: 0 });
    if (skipped) ws.alert(`${skipped} file(s) skipped because they are not images. Use Merge PDF to combine PDFs.`, 'warn');
    else if (state.items.length >= MAX_FILES) ws.alert(`You can add up to ${MAX_FILES} images at a time.`, 'warn');
    else ws.alert('');
    render();
  }

  const move = (i, j) => { if (j < 0 || j >= state.items.length) return; const [it] = state.items.splice(i, 1); state.items.splice(j, 0, it); render(); };

  function render() {
    list.innerHTML = '';
    bar.querySelector('[data-count]').textContent = `${state.items.length} ${state.items.length === 1 ? 'image' : 'images'}`;
    ws.setHint(matchMedia('(pointer: fine)').matches ? 'Drag to reorder, or use the arrows' : 'Tap the arrows to change the order');
    state.items.forEach((it, i) => {
      const img = el('img', { src: it.url, alt: '', decoding: 'async', loading: 'lazy' });
      img.style.transform = it.rot ? `rotate(${it.rot}deg)` : '';
      img.addEventListener('error', () => { ws.alert(`"${it.file.name}" cannot be shown in this browser. It will be skipped if it cannot be read.`, 'warn'); });
      const b = (icon, label, fn, disabled, cls) => el('button', { type: 'button', 'aria-label': `${label}: ${it.file.name}`, title: label, disabled: !!disabled, class: cls, html: icon, on: { click: fn } });
      list.append(el('li', { class: 'thumb-card', dataset: { id: it.id } }, [
        el('div', { class: 'thumb' }, [el('span', { class: 'num', text: i + 1 }), img]),
        el('div', { class: 'tname', text: it.file.name, title: it.file.name }),
        el('div', { class: 'tsize', text: fmtBytes(it.file.size) }),
        el('div', { class: 'tbtns' }, [
          b(SVG.left, 'Move earlier', () => move(i, i - 1), i === 0),
          b(SVG.right, 'Move later', () => move(i, i + 1), i === state.items.length - 1),
          b(SVG.rotR, 'Rotate 90°', () => { it.rot = (it.rot + 90) % 360; render(); }),
          b(SVG.x, 'Remove', () => { URL.revokeObjectURL(it.url); state.items.splice(i, 1); render(); }, false, 'del')
        ])
      ]));
    });
    list.append(el('li', {}, [el('button', { type: 'button', class: 'add-tile', on: { click: () => picker.open() } }, [el('span', { html: SVG.plus }), 'Add image'])]));
    summary();
    if (!state.items.length) ws.setCta('Add images first');
  }

  // Drag to reorder (mouse and touch).
  import('../../vendor/sortable.esm.js').then(({ default: Sortable }) => {
    Sortable.create(list, {
      animation: 150, filter: '.add-tile', draggable: '.thumb-card', delay: 180, delayOnTouchOnly: true, ghostClass: 'sortable-ghost',
      onEnd: (ev) => { if (ev.oldIndex !== ev.newIndex && ev.newIndex < state.items.length) { const [it] = state.items.splice(ev.oldIndex, 1); state.items.splice(ev.newIndex, 0, it); render(); } }
    });
  }).catch(() => {});

  async function prepare(it, q) {
    const img = await decodeImage(it.file);
    try {
      const canvas = imageToCanvas(img, { rotate: it.rot, maxSide: q.max });
      const usePng = state.o.quality === 'high' && /png/i.test(it.file.type);
      const blob = await canvasToBlob(canvas, usePng ? 'image/png' : 'image/jpeg', q.q);
      const out = { bytes: new Uint8Array(await blob.arrayBuffer()), png: usePng, w: canvas.width, h: canvas.height };
      canvas.width = canvas.height = 0;
      return out;
    } finally { img.close(); }
  }

  async function build() {
    if (ws.busy) return;
    if (!state.items.length) { picker.open(); return; }
    ws.alert('');
    const o = state.o;
    const q = QUALITY[o.quality];
    const items = state.items.slice();
    ws.setBusy(true, 'Creating PDF…');
    try {
      const doc = await PDFLib.PDFDocument.create();
      const font = o.wm && o.wmText.trim() ? await doc.embedFont(PDFLib.StandardFonts.HelveticaBold) : null;
      const embed = async (p) => (p.png ? doc.embedPng(p.bytes) : doc.embedJpg(p.bytes));
      if (o.pair) {
        for (let i = 0; i < items.length; i += 2) {
          const a = await prepare(items[i], q);
          const b = items[i + 1] ? await prepare(items[i + 1], q) : null;
          const L = layoutPair(a, b, o);
          const page = doc.addPage([L.pageW, L.pageH]);
          page.drawImage(await embed(a), L.boxes[0]);
          if (b) page.drawImage(await embed(b), L.boxes[1]);
          if (font) stamp(page, font, o.wmText.trim());
          ws.setProgress(Math.min(i + 2, items.length), items.length);
          await nextFrame();
        }
      } else {
        for (let i = 0; i < items.length; i++) {
          const p = await prepare(items[i], q);
          const L = layoutPage(p.w, p.h, o);
          const page = doc.addPage([L.pageW, L.pageH]);
          page.drawImage(await embed(p), { x: L.x, y: L.y, width: L.w, height: L.h });
          if (font) stamp(page, font, o.wmText.trim());
          ws.setProgress(i + 1, items.length);
          await nextFrame();
        }
      }
      const bytes = await savePdf(doc);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const preview = await firstPagePreview(bytes);
      showDone(ws, { blob, name: safeName(fname.get(), 'pdf', 'images'), kind: 'pdf', pages: doc.getPageCount(), preview, title: 'Your PDF is ready!', next: ['compress-pdf-to-kb', 'merge-pdf', 'add-page-numbers', 'add-watermark'] });
    } catch (e) {
      ws.alert(errorText(e));
    } finally {
      ws.setBusy(false);
      summary();
    }
  }

  add(files);
}

/** Diagonal, light watermark across the page. */
export function stamp(page, font, text) {
  const { width, height } = page.getSize();
  const size = Math.min(48, (Math.hypot(width, height) * 0.7) / Math.max(4, text.length * 0.55));
  const tw = font.widthOfTextAtSize(text, size);
  const ang = Math.atan2(height, width);
  const cx = width / 2 - (Math.cos(ang) * tw) / 2 + (Math.sin(ang) * size) / 3;
  const cy = height / 2 - (Math.sin(ang) * tw) / 2 - (Math.cos(ang) * size) / 3;
  page.drawText(text, { x: cx, y: cy, size, font, color: PDFLib.rgb(0.55, 0.57, 0.62), opacity: 0.28, rotate: PDFLib.degrees((ang * 180) / Math.PI) });
}

export async function firstPagePreview(bytes) {
  try {
    const doc = await openForRender(bytes);
    const c = await renderPage(doc, 1, { maxSide: 520 });
    doc.destroy();
    return c;
  } catch { return null; }
}
