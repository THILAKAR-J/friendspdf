// Merge PDFs and photos into one PDF, in the chosen order.
import { el, SVG, fmtBytes, isPdf, isImage, readBytes, safeName, nextFrame, UserError } from '../lib/util.js';
import { PDFLib, openForEdit, openForRender, renderPage, savePdf } from '../lib/pdf.js';
import { decodeImage, imageToCanvas, canvasToBlob } from '../lib/images.js';
import { layoutPage } from '../lib/layout.js';
import { compressPdf } from '../lib/compress.js';
import { createWorkspace, optRow, nameField, filePicker, errorText, showDone } from '../lib/ws.js';
import { firstPagePreview } from './img2pdf.js';

export async function start(app, files) {
  const state = { items: [], nextId: 1, compress: false };
  const ws = createWorkspace(app, { cta: 'Merge PDF', onCta: build });
  const list = el('ol', { class: 'file-list', 'aria-label': 'Files in merge order' });
  ws.main.append(list, el('button', { type: 'button', class: 'add-row', on: { click: () => picker.open() } }, [el('span', { html: SVG.plus }), 'Add more PDFs or photos']));
  const picker = filePicker('application/pdf,.pdf,image/*', true, (f) => add(f));
  const summaryEl = el('div', {}, [el('strong', { class: 'h3' }), el('div', { class: 'small muted' })]);
  ws.addSetting(summaryEl);
  ws.addSetting(optRow('Compress after merging', 'Smaller file for upload forms and WhatsApp', false, (v) => { state.compress = v; summary(); }));
  const fname = nameField('merged');
  ws.addSetting(fname.node);

  function summary() {
    const pages = state.items.reduce((s, it) => s + (it.pages || 0), 0);
    const size = state.items.reduce((s, it) => s + it.file.size, 0);
    summaryEl.firstChild.textContent = `${state.items.length} ${state.items.length === 1 ? 'file' : 'files'} · ${pages} ${pages === 1 ? 'page' : 'pages'}`;
    summaryEl.lastChild.textContent = `About ${fmtBytes(size)} before merging`;
    ws.setCta(state.items.length < 2 ? 'Add at least 2 files' : 'Merge PDF');
  }

  async function add(newFiles) {
    const ok = newFiles.filter((f) => isPdf(f) || isImage(f));
    if (ok.length < newFiles.length) ws.alert(`${newFiles.length - ok.length} file(s) skipped. Only PDFs and images can be merged.`, 'warn'); else ws.alert('');
    for (const f of ok) {
      const it = { id: state.nextId++, file: f, kind: isPdf(f) ? 'pdf' : 'img', pages: isPdf(f) ? null : 1, error: null, thumb: null };
      state.items.push(it);
      if (it.kind === 'img') it.thumb = el('img', { src: URL.createObjectURL(f), alt: '' });
    }
    render();
    for (const it of state.items.filter((x) => x.kind === 'pdf' && x.pages === null && !x.error)) {
      try {
        const bytes = await readBytes(it.file);
        const doc = await openForEdit(bytes);
        it.pages = doc.getPageCount();
        render();
        const r = await openForRender(bytes);
        it.thumb = await renderPage(r, 1, { maxWidth: 84 });
        r.destroy();
      } catch (e) {
        it.error = errorText(e);
      }
      render();
    }
  }

  const move = (i, j) => { if (j < 0 || j >= state.items.length) return; const [x] = state.items.splice(i, 1); state.items.splice(j, 0, x); render(); };

  function render() {
    list.innerHTML = '';
    ws.setHint(matchMedia('(pointer: fine)').matches ? 'Drag the ≡ handle to change the order' : 'Hold and drag ≡, or use the arrows');
    state.items.forEach((it, i) => {
      const meta = it.error ? it.error : `${it.pages === null ? 'Reading…' : it.pages + (it.pages === 1 ? ' page' : ' pages')} · ${fmtBytes(it.file.size)}`;
      const b = (icon, label, fn, disabled) => el('button', { type: 'button', 'aria-label': `${label}: ${it.file.name}`, title: label, disabled: !!disabled, html: icon, on: { click: fn } });
      list.append(el('li', { class: 'file-row', dataset: { id: it.id } }, [
        el('span', { class: 'n', text: i + 1 }),
        el('span', { class: 'prev', 'aria-hidden': 'true' }, [it.thumb ? it.thumb : el('span', { class: 'fi' + (it.kind === 'img' ? ' img' : ''), text: it.kind === 'img' ? 'IMG' : 'PDF' })]),
        el('div', { class: 'meta' }, [el('strong', { text: it.file.name, title: it.file.name }), el('small', { class: it.error ? 'err-text' : '', text: meta })]),
        el('div', { class: 'mini' }, [
          b(SVG.up, 'Move up', () => move(i, i - 1), i === 0),
          b(SVG.down, 'Move down', () => move(i, i + 1), i === state.items.length - 1),
          b(SVG.x, 'Remove', () => { state.items.splice(i, 1); render(); }),
          el('span', { class: 'handle mini-h', 'aria-hidden': 'true', title: 'Drag to reorder', html: SVG.grip })
        ])
      ]));
    });
    summary();
  }

  import('../../vendor/sortable.esm.js').then(({ default: Sortable }) => {
    Sortable.create(list, { animation: 150, handle: '.handle', ghostClass: 'sortable-ghost', onEnd: (ev) => { if (ev.oldIndex !== ev.newIndex) { const [x] = state.items.splice(ev.oldIndex, 1); state.items.splice(ev.newIndex, 0, x); render(); } } });
  }).catch(() => {});

  async function build() {
    if (ws.busy) return;
    if (state.items.length < 2) { picker.open(); return; }
    const bad = state.items.find((x) => x.error);
    if (bad) { ws.alert(`Remove "${bad.file.name}" first: ${bad.error}`); return; }
    ws.alert('');
    ws.setBusy(true, 'Merging…');
    try {
      const out = await PDFLib.PDFDocument.create();
      const items = state.items.slice();
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === 'pdf') {
          const src = await openForEdit(await readBytes(it.file));
          const pages = await out.copyPages(src, src.getPageIndices());
          pages.forEach((p) => out.addPage(p));
        } else {
          const img = await decodeImage(it.file);
          try {
            const c = imageToCanvas(img, { maxSide: 2000 });
            const jpg = await out.embedJpg(new Uint8Array(await (await canvasToBlob(c, 'image/jpeg', 0.82)).arrayBuffer()));
            const L = layoutPage(c.width, c.height, { pageSize: 'a4', orientation: 'auto', margin: 'small' });
            out.addPage([L.pageW, L.pageH]).drawImage(jpg, { x: L.x, y: L.y, width: L.w, height: L.h });
            c.width = c.height = 0;
          } finally { img.close(); }
        }
        ws.setProgress(i + 1, items.length + (state.compress ? 2 : 0));
        await nextFrame();
      }
      let bytes = await savePdf(out);
      const before = items.reduce((s, it) => s + it.file.size, 0);
      if (state.compress) {
        ws.setBusy(true, 'Compressing…');
        const r = await compressPdf(bytes, { targetBytes: null });
        bytes = r.bytes;
      }
      if (!bytes.length) throw new UserError('The merged PDF came out empty.');
      const blob = new Blob([bytes], { type: 'application/pdf' });
      showDone(ws, { blob, name: safeName(fname.get(), 'pdf', 'merged'), kind: 'pdf', pages: out.getPageCount(), before: state.compress ? before : null, preview: await firstPagePreview(bytes), title: 'Your merged PDF is ready!', next: ['compress-pdf-to-kb', 'add-page-numbers', 'split-pdf', 'add-watermark'] });
    } catch (e) {
      ws.alert(errorText(e));
    } finally {
      ws.setBusy(false);
      summary();
    }
  }

  await add(files);
}
