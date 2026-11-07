// Small DOM and file helpers shared by every tool.

/** An error whose message is safe and helpful to show to the user. */
export class UserError extends Error {}

export const SVG = {
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></svg>',
  rotR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>',
  rotL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 8h14M5 12h14M5 16h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4"/><path d="m15.4 6.5-6.8 4"/></svg>',
  arrowR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>'
};

/** Create an element. props: class, text, html, attrs object, on {event: fn}, children array. */
export function el(tag, props = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v; // only ever used with our own static SVG strings
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) n.addEventListener(ev, fn);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (v === true) n.setAttribute(k, '');
    else n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c !== null && c !== undefined && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
}

export function fmtBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024 < 10 ? (Math.ceil(b / 102.4) / 10).toFixed(1) : Math.ceil(b / 1024)) + ' KB'; // rounded up, never under-reports
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}
/** Size for KB-target tools: always rounded UP so the label never under-reports. */
export function fmtKB(b) { return Math.ceil(b / 1024) + ' KB'; }

export function baseName(name) { return String(name || 'file').replace(/\.[^./\\]+$/, ''); }

/** Safe download file name; keeps Indian scripts and spaces, removes characters file systems reject. */
export function safeName(name, ext, fallback = 'document') {
  let n = String(name || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim();
  n = n.replace(new RegExp('\\.' + ext + '$', 'i'), '').replace(/^\.+/, '').trim();
  if (!n) n = fallback;
  return n.slice(0, 100) + '.' + ext;
}

export const nextFrame = () => new Promise((r) => setTimeout(r, 0));

export function readBytes(file) { return file.arrayBuffer().then((b) => new Uint8Array(b)); }

export function isPdf(file) { return file.type === 'application/pdf' || /\.pdf$/i.test(file.name); }
export function isImage(file) { return (file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name); }
export function isHeic(file) { return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name); }

let toastTimer;
export function toast(msg) {
  const t = document.querySelector('.toast');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function canShareFiles(files) {
  try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files })); } catch { return false; }
}

export async function shareFiles(files, title) {
  try { await navigator.share({ files, title }); return true; } catch (e) { if (e && e.name !== 'AbortError') toast('Sharing is not available here. Use Download instead.'); return false; }
}

/** Parse "1-3, 5, 8-" style page lists into zero-based indexes within [0,total). */
export function parseRanges(text, total) {
  const out = new Set();
  for (const part of String(text).split(/[,\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d*)\s*-\s*(\d*)$/);
    if (m) {
      const a = m[1] ? parseInt(m[1], 10) : 1;
      const b = m[2] ? parseInt(m[2], 10) : total;
      for (let i = Math.max(1, Math.min(a, b)); i <= Math.min(total, Math.max(a, b)); i++) out.add(i - 1);
    } else if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n >= 1 && n <= total) out.add(n - 1);
    }
  }
  return [...out].sort((x, y) => x - y);
}

/** Turn [0,1,2,4] into "1-3, 5". */
export function formatRanges(idx) {
  const s = [...idx].sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    parts.push(i === j ? String(s[i] + 1) : `${s[i] + 1}-${s[j] + 1}`);
    i = j;
  }
  return parts.join(', ');
}

export function presetFromPage(app) {
  let p = {};
  try { p = JSON.parse(app.dataset.preset || '{}'); } catch { /* ignore */ }
  const q = new URLSearchParams(location.search);
  const num = (k) => { const v = parseFloat(q.get(k)); return Number.isFinite(v) && v > 0 && v < 100000 ? v : undefined; };
  if (num('target')) p.target = num('target');
  if (num('max')) p.max = num('max');
  if (q.has('min')) p.min = num('min') || 0;
  return p;
}
