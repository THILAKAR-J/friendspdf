// Behaviour for content pages: home quick start, exam pickers, tool search, help-me-choose, recent files.
import { el, fmtBytes, downloadBlob } from './lib/util.js';
import { listRecent, deleteRecent, clearRecent, keepRecent, setKeepRecent, timeAgo } from './lib/store.js';

const rel = document.body.dataset.rel || './';

// ---------- home: quick start tabs ----------
const quick = document.querySelector('[data-quick]');
if (quick) {
  const tabs = [...quick.querySelectorAll('[role="tab"]')];
  const title = quick.querySelector('[data-q-title]');
  const btn = quick.querySelector('[data-q-btn]');
  const fm = quick.querySelector('[data-q-formats]');
  const select = (t) => {
    tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    title.textContent = t.dataset.title;
    btn.textContent = t.dataset.btn;
    btn.href = rel + t.dataset.q + '/';
    fm.textContent = t.dataset.formats;
  };
  tabs.forEach((t) => t.addEventListener('click', () => select(t)));
  arrowKeys(tabs, select);
}

// ---------- exam pickers ----------
for (const box of document.querySelectorAll('[data-exams]')) {
  const tabs = [...box.querySelectorAll('[data-exam-tab]')];
  const panels = [...box.querySelectorAll('[data-exam-panel]')];
  const select = (t) => {
    tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    panels.forEach((p) => p.toggleAttribute('data-hidden', p.dataset.examPanel !== t.dataset.examTab));
  };
  tabs.forEach((t) => t.addEventListener('click', () => select(t)));
  arrowKeys(tabs, select);
}

function arrowKeys(tabs, select) {
  tabs.forEach((t, i) => t.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = tabs[(i + d + tabs.length) % tabs.length];
    n.focus();
    select(n);
  }));
}

// ---------- all tools: search + category filter ----------
const search = document.querySelector('[data-tool-search]');
if (search) {
  const input = search.querySelector('input');
  const chips = [...document.querySelectorAll('[data-filter]')];
  const groups = [...document.querySelectorAll('[data-group]')];
  const none = document.querySelector('[data-no-results]');
  let cat = 'all';
  const apply = () => {
    const words = input.value.toLowerCase().replace(/kb/g, ' kb').split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const g of groups) {
      let any = false;
      for (const t of g.querySelectorAll('.tile')) {
        const hay = t.dataset.search || '';
        const ok = (cat === 'all' || t.dataset.cat === cat) && words.every((w) => hay.includes(w));
        t.hidden = !ok;
        if (ok) { any = true; shown++; }
      }
      g.hidden = !any;
    }
    none.hidden = shown > 0;
  };
  search.addEventListener('submit', (e) => { e.preventDefault(); const first = document.querySelector('.tool-group:not([hidden]) a.tile:not([hidden])'); if (first) location.href = first.href; });
  input.addEventListener('input', apply);
  chips.forEach((c) => c.addEventListener('click', () => { cat = c.dataset.filter; chips.forEach((x) => x.setAttribute('aria-selected', String(x === c))); apply(); }));
  const q = new URLSearchParams(location.search).get('q');
  if (q) { input.value = q; apply(); }
  if (location.hash === '#search') setTimeout(() => input.focus(), 50);
}

// ---------- help me choose ----------
const guide = document.querySelector('[data-guide]');
if (guide) {
  const HAVES = [
    { id: 'img', label: 'Photos or screenshots', hint: 'From camera or gallery', tag: 'IMG' },
    { id: 'pdf', label: 'A PDF file', hint: 'Downloaded or from WhatsApp', tag: 'PDF' },
    { id: 'doc', label: 'A Word document', hint: 'Resume, letter, assignment', tag: 'DOC' },
    { id: 'many', label: 'Many files to join', hint: 'PDFs and photos together', tag: '+' }
  ];
  const WANTS = {
    img: [
      { id: 'one', label: 'Make one PDF', hint: 'All photos become pages', tag: 'PDF', to: 'jpg-to-pdf' },
      { id: 'small', label: 'Make it small for a form', hint: 'Photo to exact KB', tag: 'KB', to: 'resize-image-to-kb', kb: true },
      { id: 'sig', label: 'Resize my signature', hint: '10 to 20 KB for forms', tag: 'SIG', to: 'signature-resize' },
      { id: 'id', label: 'ID card on one page', hint: 'Front and back together', tag: 'ID', to: 'jpg-to-pdf' }
    ],
    pdf: [
      { id: 'small', label: 'Make it smaller', hint: 'For a form, email or WhatsApp', tag: 'KB', to: 'compress-pdf-to-kb', kb: true },
      { id: 'jpg', label: 'Turn pages into photos', hint: 'Each page becomes a JPG', tag: 'JPG', to: 'pdf-to-jpg' },
      { id: 'pages', label: 'Keep only some pages', hint: 'Remove pages you do not need', tag: '÷', to: 'split-pdf' },
      { id: 'join', label: 'Join with another file', hint: 'Add PDFs or photos', tag: '+', to: 'merge-pdf' },
      { id: 'rotate', label: 'Fix sideways pages', hint: 'Rotate the wrong pages', tag: '↻', to: 'rotate-pdf' },
      { id: 'num', label: 'Add page numbers', hint: '1, 2, 3 on every page', tag: '#', to: 'add-page-numbers' },
      { id: 'wm', label: 'Protect with a watermark', hint: 'e.g. "Only for bank KYC"', tag: 'W', to: 'add-watermark' }
    ],
    doc: [{ id: 'soon', label: 'Turn it into a PDF', hint: 'Coming in the next update. For now: open it in Word or Google Docs and choose "Save as PDF".', tag: 'PDF', to: null }],
    many: [
      { id: 'join', label: 'Join into one PDF', hint: 'In the order you choose', tag: '+', to: 'merge-pdf' },
      { id: 'joinsmall', label: 'Join and make it small', hint: 'Merge, then compress to KB', tag: 'KB', to: 'merge-pdf' }
    ]
  };
  const KBS = [['100', '100 KB'], ['200', '200 KB'], ['auto', 'Smallest']];
  const s = { step: 1, have: new URLSearchParams(location.search).get('have') || 'pdf', want: null, kb: '200' };
  if (!WANTS[s.have]) s.have = 'pdf';
  if (new URLSearchParams(location.search).get('have')) s.step = 2;
  const $ = (sel) => guide.querySelector(sel);
  const opts = $('[data-g-options]');
  const nextBtn = document.querySelector('[data-g-next]');
  const nextBar = document.querySelector('[data-g-nextbar]');
  const option = (o, on, pick) => el('button', { type: 'button', role: 'radio', class: 'g-opt', 'aria-checked': String(on), on: { click: pick } }, [el('span', { class: 'have-tag t-' + (o.id === 'pdf' || o.tag === 'PDF' ? 'pdf' : o.tag === 'DOC' ? 'doc' : o.tag === '+' ? 'many' : 'img'), text: o.tag }), el('span', {}, [el('strong', { text: o.label }), el('small', { text: o.hint })])]);
  const render = () => {
    const wants = WANTS[s.have];
    const want = wants.find((w) => w.id === s.want) || wants[0];
    s.want = want.id;
    $('[data-g-step]').textContent = `Step ${s.step} of 3 · about 30 seconds`;
    guide.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', s.step);
    $('[data-g-bar]').style.width = Math.round((s.step / 3) * 100) + '%';
    $('[data-g-back]').hidden = s.step === 1;
    const chips = $('[data-g-chips]');
    chips.hidden = s.step === 1;
    chips.innerHTML = '';
    chips.append(el('span', { text: 'You have: ' + HAVES.find((h) => h.id === s.have).label }));
    if (s.step === 3) chips.append(el('span', { text: 'You want: ' + want.label + (want.kb ? ' · ' + (s.kb === 'auto' ? 'smallest' : s.kb + ' KB') : '') }));
    $('[data-g-q]').textContent = s.step === 1 ? 'What do you have?' : s.step === 2 ? 'What do you want to do with it?' : 'Ready. Open the tool.';
    $('[data-g-sub]').textContent = s.step === 1 ? 'Tap one. We show what you can do with it.' : s.step === 2 ? 'Pick one. You can change it later.' : 'Your settings are filled in. Everything stays on your device.';
    opts.innerHTML = '';
    opts.hidden = s.step === 3;
    if (s.step === 1) HAVES.forEach((h) => opts.append(option(h, h.id === s.have, () => { s.have = h.id; s.want = null; render(); })));
    if (s.step === 2) wants.forEach((w) => opts.append(option(w, w.id === s.want, () => { s.want = w.id; render(); })));
    const kbBox = $('[data-g-kb]');
    kbBox.hidden = !(s.step === 2 && want.kb);
    const kbs = $('[data-g-kbs]');
    kbs.innerHTML = '';
    KBS.forEach(([v, l]) => kbs.append(el('button', { type: 'button', 'aria-pressed': String(v === s.kb), on: { click: () => { s.kb = v; render(); } } }, [l])));
    const fin = $('[data-g-final]');
    fin.hidden = s.step !== 3;
    fin.innerHTML = '';
    if (s.step === 3) {
      if (!want.to) {
        fin.append(el('p', { text: want.hint }), el('a', { class: 'btn btn-dark btn-lg btn-block', href: rel + 'tools/' }, ['See all tools']));
      } else {
        let q = '';
        if (want.kb && s.kb !== 'auto') q = want.to === 'compress-pdf-to-kb' ? `?target=${s.kb}` : `?min=0&max=${s.kb}`;
        const to = want.kb && s.kb === 'auto' && want.to === 'compress-pdf-to-kb' ? 'compress-pdf' : want.to;
        fin.append(el('a', { class: 'btn btn-dark btn-lg btn-block', href: rel + to + '/' + q, 'data-g-go': '' }, ['Open the tool →']), el('p', { class: 'small muted', text: 'Nothing is uploaded. Your file stays on this device.' }));
      }
    }
    nextBar.hidden = s.step === 3;
  };
  nextBtn.addEventListener('click', () => { s.step = Math.min(3, s.step + 1); render(); guide.scrollIntoView({ block: 'start' }); });
  $('[data-g-back]').addEventListener('click', () => { s.step = Math.max(1, s.step - 1); render(); });
  render();
}

// ---------- recent files ----------
const recentLists = document.querySelectorAll('[data-recent-list]');
if (recentLists.length) renderRecent();

async function renderRecent() {
  const items = await listRecent();
  const strip = document.querySelector('[data-recent-strip]');
  const empty = document.querySelector('[data-recent-empty]');
  const clear = document.querySelector('[data-recent-clear]');
  const toggle = document.querySelector('[data-recent-toggle]');
  if (toggle) {
    toggle.checked = keepRecent();
    toggle.onchange = async () => { setKeepRecent(toggle.checked); if (!toggle.checked) { await clearRecent(); renderRecent(); } };
  }
  for (const list of recentLists) {
    const big = list.classList.contains('big');
    list.innerHTML = '';
    for (const r of (big ? items : items.slice(0, 3))) {
      const kind = r.kind === 'jpg' ? 'img' : r.kind === 'zip' ? 'zip' : '';
      const row = el('div', { class: 'recent-item' }, [
        el('span', { class: 'fi ' + kind, text: (r.kind || 'pdf').toUpperCase(), 'aria-hidden': 'true' }),
        el('span', { class: 'ri-text' }, [el('strong', { text: r.name }), el('small', { text: `${timeAgo(r.created)} · ${fmtBytes(r.size)}` })]),
        el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Download ' + r.name, html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>', on: { click: () => downloadBlob(r.blob, r.name) } })
      ]);
      if (big) row.append(el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Delete ' + r.name, html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>', on: { click: async () => { await deleteRecent(r.id); renderRecent(); } } }));
      list.append(row);
    }
  }
  if (strip) strip.hidden = !items.length;
  if (empty) empty.hidden = !!items.length;
  if (clear) { clear.hidden = !items.length; clear.onclick = async () => { await clearRecent(); renderRecent(); }; }
}
