// Workspace scaffolding (settings panel, action bar, progress, result screen) shared by all tools.
import { el, SVG, fmtBytes, canShareFiles, shareFiles, toast, UserError } from './util.js';
import { addRecent } from './store.js';

const REL = () => document.body.dataset.rel || '../';

const NEXT = {
  'compress-pdf-to-kb': ['KB', 'Compress to KB', 'cat-optimize'],
  'merge-pdf': ['+', 'Merge with another file', 'cat-organize'],
  'add-page-numbers': ['#', 'Add page numbers', 'cat-organize'],
  'add-watermark': ['W', 'Add watermark', 'cat-protect'],
  'split-pdf': ['÷', 'Split PDF', 'cat-organize'],
  'rotate-pdf': ['↻', 'Rotate PDF', 'cat-organize'],
  'jpg-to-pdf': ['JPG', 'JPG to PDF', 'cat-convert'],
  'pdf-to-jpg': ['JPG', 'PDF to JPG', 'cat-convert'],
  'resize-image-to-kb': ['KB', 'Resize photo to KB', 'cat-optimize'],
  'signature-resize': ['SIG', 'Signature resize', 'cat-optimize']
};

export function filePicker(accept, multiple, onFiles, capture) {
  const input = el('input', { type: 'file', class: 'sr-only', accept, multiple: !!multiple, capture: capture || undefined, tabindex: '-1', 'aria-hidden': 'true' });
  input.addEventListener('change', () => { if (input.files && input.files.length) onFiles([...input.files]); input.value = ''; });
  document.body.append(input);
  return { open: () => input.click() };
}

export function createWorkspace(app, { hint = '', cta = 'Create PDF', onCta, ctaClass = 'btn-primary' }) {
  document.body.classList.add('working');
  app.innerHTML = '';
  const hintEl = el('span', { class: 'hint', text: hint });
  const bar = el('div', { class: 'ws-bar' }, [hintEl, el('span', { class: 'status-pill', text: 'Private mode · 0 bytes uploaded' })]);
  const main = el('section', { class: 'ws-main', 'aria-label': 'Files' });
  const side = el('aside', { class: 'ws-side', 'aria-label': 'Settings' });
  const alertBox = el('div', { role: 'alert', 'aria-live': 'assertive' });
  const progress = el('div', { class: 'progress-line', hidden: true }, [el('span')]);
  const sideBtn = el('button', { type: 'button', class: `btn ${ctaClass} btn-lg side-cta`, on: { click: () => onCta() } }, [cta]);
  const sideFoot = el('div', {}, [sideBtn, progress]);
  const barBtn = el('button', { type: 'button', class: `btn ${ctaClass} btn-lg`, on: { click: () => onCta() } }, [cta]);
  const barProgress = el('div', { class: 'progress-line', hidden: true }, [el('span')]);
  const actionbar = el('div', { class: 'actionbar' }, [el('div', { class: 'inner' }, [barBtn]), barProgress, el('p', { text: 'Nothing is uploaded' })]);
  const work = el('div', { class: 'ws-wrap' }, [bar, el('div', { class: 'ws' }, [main, side]), alertBox]);
  const result = el('div', { class: 'ws-result', hidden: true, tabindex: '-1' });
  app.append(work, result, actionbar);
  side.append(sideFoot); // settings are inserted before this by the tool

  let busy = false;
  const ws = {
    app, main, side, sideFoot, hintEl,
    addSetting(node) { side.insertBefore(node, sideFoot); return node; },
    setHint(t) { hintEl.textContent = t; },
    setCta(label) { sideBtn.textContent = label; barBtn.textContent = label; },
    get busy() { return busy; },
    setBusy(on, label) {
      busy = on;
      for (const b of [sideBtn, barBtn]) { b.disabled = on; if (label) b.textContent = label; }
      progress.hidden = barProgress.hidden = !on;
      if (!on) ws.setProgress(0, 1);
    },
    setProgress(done, total) {
      const pct = total ? Math.round((done / total) * 100) : 0;
      progress.firstChild.style.width = barProgress.firstChild.style.width = pct + '%';
    },
    alert(msg, kind = 'err') { alertBox.innerHTML = ''; if (msg) alertBox.append(el('p', { class: `alert ${kind}`, text: msg })); },
    showWork() { result.hidden = true; work.hidden = false; actionbar.hidden = false; },
    showResult(node) {
      result.innerHTML = ''; result.append(node); result.hidden = false; work.hidden = true; actionbar.hidden = true;
      app.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => { const h = result.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }, 50);
    }
  };
  return ws;
}

/** Segmented control. options: [[value, label], ...] */
export function seg(label, options, value, onChange, cls = '') {
  const wrap = el('div', { class: 'field' });
  const id = 'seg-' + Math.random().toString(36).slice(2, 7);
  wrap.append(el('span', { class: 'field-label', id, text: label }));
  const group = el('div', { class: `seg ${cls}`, role: 'group', 'aria-labelledby': id });
  const btns = options.map(([v, l]) => el('button', { type: 'button', 'aria-pressed': String(v === value), on: { click: () => { btns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn(v)))); onChange(v); } } }, [l]));
  const btn = (v) => btns[options.findIndex((o) => o[0] === v)];
  group.append(...btns);
  wrap.append(group);
  return wrap;
}

export function optRow(title, small, checked, onChange) {
  const input = el('input', { type: 'checkbox', checked: !!checked, on: { change: () => onChange(input.checked) } });
  return el('label', { class: 'opt-row' }, [el('span', {}, [el('strong', { text: title }), el('small', { text: small })]), input]);
}

export function nameField(value, ext = 'pdf') {
  const id = 'fn-' + Math.random().toString(36).slice(2, 7);
  const input = el('input', { id, type: 'text', value, maxlength: '80', autocomplete: 'off', spellcheck: 'false' });
  const node = el('div', { class: 'field' }, [el('label', { class: 'field-label', for: id, text: 'File name' }), el('div', { class: 'name-field' }, [input, el('span', { text: '.' + ext })])]);
  return { node, get: () => input.value };
}

export function errorText(e) {
  if (e instanceof UserError) return e.message;
  if (e && /memory|allocation|Array buffer/i.test(String(e.message))) return 'Your device ran out of memory. Try fewer pages or smaller images.';
  console.error(e);
  return 'Something went wrong while processing. Please try again, or try a smaller file.';
}

/**
 * Result screen.
 * r: { blob, name, kind: 'pdf'|'jpg'|'zip', pages, preview (canvas|img), title, sub, before, softNote, files (extra downloadable [{blob,name}]), next: [slugs], ws }
 */
export function showDone(ws, r) {
  const rel = REL();
  const url = URL.createObjectURL(r.blob);
  const fileIcon = el('span', { class: 'fi ' + (r.kind === 'jpg' ? 'img' : r.kind === 'zip' ? 'zip' : ''), text: r.kind.toUpperCase(), 'aria-hidden': 'true' });
  const sizeText = r.before ? `${fmtBytes(r.before)} → ${fmtBytes(r.blob.size)}` : fmtBytes(r.blob.size);
  const metaBits = [r.pages ? `${r.pages} ${r.pages === 1 ? 'page' : 'pages'}` : null, sizeText].filter(Boolean).join(' · ');
  const dl = el('a', { class: 'btn btn-primary btn-lg', href: url, download: r.name, 'data-download': '' }, [el('span', { html: SVG.download }), 'Download ' + (r.kind === 'zip' ? 'ZIP' : r.kind.toUpperCase())]);
  const shareFile = new File([r.blob], r.name, { type: r.blob.type });
  const btns = el('div', { class: 'done-btns' }, [dl]);
  if (canShareFiles([shareFile])) btns.append(el('button', { type: 'button', class: 'btn btn-outline btn-lg', on: { click: () => shareFiles([shareFile], r.name) } }, [el('span', { html: SVG.share }), 'Share (WhatsApp, Mail)']));
  const links = el('div', { class: 'done-links' });
  if (r.kind === 'pdf' && !r.noCompressHint && r.blob.size > 200 * 1024) links.append(el('a', { href: rel + 'compress-pdf-to-kb/', class: 'ok-link', text: 'Too big for your form? Compress to KB →' }));
  links.append(el('button', { type: 'button', class: 'link-btn', on: { click: () => ws.showWork() } }, ['Edit again']));
  links.append(el('a', { href: location.pathname, text: 'Start a new file' }));
  const head = el('div', { class: 'done-head' }, [el('span', { class: 'done-check', html: SVG.check }), el('div', {}, [el('h2', { text: r.title || 'Your file is ready!' }), el('p', { text: r.sub || 'Tap Download to save it. Nothing was uploaded.' })])]);
  const card = el('div', { class: 'file-card' }, [fileIcon, el('div', { class: 'meta' }, [el('strong', { text: r.name }), el('small', { text: metaBits })])]);
  const mainCol = el('div', { class: 'done-main' }, [head, card]);
  if (r.extra) mainCol.append(r.extra);
  mainCol.append(btns);
  if (r.softNote) mainCol.append(el('p', { class: 'alert warn', text: r.softNote }));
  mainCol.append(links);
  if (r.files && r.files.length > 1) {
    const list = el('ul', { class: 'img-list', 'aria-label': 'Single files' });
    for (const f of r.files) {
      const u = URL.createObjectURL(f.blob);
      list.append(el('li', {}, [el('a', { href: u, download: f.name }, [f.blob.type.startsWith('image/') ? el('img', { src: u, alt: f.name, loading: 'lazy' }) : '', f.name])]));
    }
    mainCol.append(el('p', { class: 'small muted', text: 'Or download single files:' }), list);
  }
  const box = el('div', { class: 'done' });
  if (r.preview) box.append(el('div', { class: 'done-preview', 'aria-hidden': 'true' }, [r.preview]));
  box.append(mainCol);
  const wrap = el('div', {}, [box]);
  if (r.after) wrap.append(r.after);
  const next = (r.next || []).filter((s) => NEXT[s]);
  if (next.length) {
    wrap.append(el('h2', { class: 'h3 next-h', text: 'What next?' }));
    wrap.append(el('div', { class: 'next-grid' }, next.map((s) => el('a', { href: rel + s + '/', class: NEXT[s][2] }, [el('span', { class: 'tile-icon' + ([...NEXT[s][0]].length === 1 ? ' sym' : ''), text: NEXT[s][0], 'aria-hidden': 'true' }), NEXT[s][1]]))));
  }
  ws.showResult(wrap);
  addRecent({ name: r.name, blob: r.blob, pages: r.pages, kind: r.kind });
  toast('Done! Nothing was uploaded.');
  return { url };
}
