// Recent files, kept only in this browser (IndexedDB). Auto-deleted after 7 days.
const DB = 'friendspdf';
const STORE = 'recent';
const MAX_AGE = 7 * 24 * 3600 * 1000;
const MAX_ITEMS = 15;
const MAX_BYTES = 150 * 1024 * 1024;
const KEY = 'fp-keep-recent';

export function keepRecent() {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}
export function setKeepRecent(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* private mode */ }
}

function open() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no idb'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const s = t.objectStore(STORE);
    const out = fn(s);
    t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function listRecent() {
  try {
    const db = await open();
    const all = await tx(db, 'readonly', (s) => s.getAll());
    const now = Date.now();
    const fresh = (all || []).filter((r) => now - r.created < MAX_AGE).sort((a, b) => b.created - a.created);
    const stale = (all || []).filter((r) => now - r.created >= MAX_AGE);
    if (stale.length) await tx(db, 'readwrite', (s) => stale.forEach((r) => s.delete(r.id)));
    db.close();
    return fresh;
  } catch { return []; }
}

export async function addRecent({ name, blob, pages, kind }) {
  if (!keepRecent()) return;
  try {
    const db = await open();
    const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    await tx(db, 'readwrite', (s) => s.put({ id, name, blob, size: blob.size, pages: pages || null, kind, created: Date.now() }));
    // Trim to limits (newest first).
    const all = (await tx(db, 'readonly', (s) => s.getAll())).sort((a, b) => b.created - a.created);
    let bytes = 0;
    const drop = [];
    all.forEach((r, i) => { bytes += r.size; if (i >= MAX_ITEMS || bytes > MAX_BYTES) drop.push(r.id); });
    if (drop.length) await tx(db, 'readwrite', (s) => drop.forEach((d) => s.delete(d)));
    db.close();
  } catch { /* storage full or blocked: recent files are optional */ }
}

export async function deleteRecent(id) {
  try { const db = await open(); await tx(db, 'readwrite', (s) => s.delete(id)); db.close(); } catch { /* ignore */ }
}
export async function clearRecent() {
  try { const db = await open(); await tx(db, 'readwrite', (s) => s.clear()); db.close(); } catch { /* ignore */ }
}

export function timeAgo(t) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.round(s / 60);
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.round(h / 24);
  return d === 1 ? 'Yesterday' : d + ' days ago';
}
