/* FriendsPDF admin. Edits data/content.json through /admin/api; the site rebuilds itself after each publish. */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const S = { me: null, meta: null, pages: [], content: null, sha: null, saved: '', view: 'dashboard', path: '/', tab: 'seo', filter: 'All', q: '', activity: null, busy: false };

  /* ---------- helpers ---------- */
  const h = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const len = (s) => Array.from(String(s || '')).length;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: drafts last for this visit only */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  function toast(msg, bad) {
    toastEl.textContent = msg; toastEl.className = bad ? 'bad' : ''; toastEl.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { toastEl.hidden = true; }, bad ? 7000 : 4000);
  }
  function api(path, opts) {
    opts = opts || {};
    return fetch('api/' + path, { method: opts.method || 'GET', headers: opts.body ? { 'Content-Type': 'application/json' } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: 'same-origin' })
      .then((r) => r.json().catch(() => ({})).then((d) => { d._status = r.status; return d; }));
  }
  const ICON = {
    dash: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    pages: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/>',
    site: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>'
  };
  const ico = (k) => '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>';
  const LOGO = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="background:#1D4ED8;border-radius:9px;padding:6px"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/></svg>';
  const when = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

  /* ---------- page model ---------- */
  const pageBy = (path) => S.pages.find((p) => p.path === path);
  const ov = (path) => (S.content.pages && S.content.pages[path]) || {};
  const plain = (s) => String(s || '').replace(/\*\*/g, '');
  function current(p) {
    const d = p.defaults, o = ov(p.path);
    return { title: o.title != null ? o.title : d.title, description: o.description != null ? o.description : d.description, h1: o.h1 != null ? o.h1 : d.h1, faq: o.faq || d.faq, extra: o.extra || '', noindex: !!o.noindex };
  }
  function setField(path, key, value) {
    const p = pageBy(path), d = p.defaults;
    S.content.pages = S.content.pages || {};
    const o = S.content.pages[path] || {};
    const same = key === 'faq' ? JSON.stringify(value) === JSON.stringify(d.faq) : key === 'noindex' ? !value : key === 'extra' ? !String(value).trim() : value === d[key];
    if (same) delete o[key]; else o[key] = value;
    if (Object.keys(o).length) S.content.pages[path] = o; else delete S.content.pages[path];
    saveDraft();
  }
  function kindOf(path) {
    if (path === '/') return 'Home';
    if (['/tools/', '/exam-forms/', '/help-me-choose/', '/recent/'].indexOf(path) >= 0) return 'Guides';
    if (['/privacy/', '/terms/'].indexOf(path) >= 0) return 'Legal';
    return 'Tools';
  }
  const labelOf = (p) => (p.path === '/' ? 'Home page' : plain(current(p).h1) || p.path);

  /* ---------- checks (the build runs the same rules again before publishing) ---------- */
  function checksFor(p) {
    const c = current(p), out = [], tl = len(c.title), dl = len(c.description);
    out.push(tl < 20 || tl > 78 ? ['err', 'Title is ' + tl + ' characters; keep it between 20 and 65'] : tl > 65 ? ['warn', 'Title is ' + tl + ' characters; Google may cut it after about 65'] : ['ok', 'Title ' + tl + ' characters']);
    out.push(dl < 70 || dl > 175 ? ['err', 'Description is ' + dl + ' characters; keep it between 70 and 160'] : dl > 160 ? ['warn', 'Description is ' + dl + ' characters; Google may cut it after about 160'] : ['ok', 'Description ' + dl + ' characters']);
    const dupT = S.pages.some((q) => q !== p && current(q).title.trim() === c.title.trim());
    const dupD = S.pages.some((q) => q !== p && current(q).description.trim() === c.description.trim());
    out.push(dupT || dupD ? ['err', (dupT ? 'Title' : 'Description') + ' is the same as another page'] : ['ok', 'Title and description used by no other page']);
    out.push(plain(c.h1).trim() ? ['ok', 'One H1: ' + plain(c.h1).slice(0, 40)] : ['err', 'The H1 heading is empty']);
    if (p.defaults.hasFaq) out.push(c.faq.every((x) => x.q.trim() && x.a.trim()) ? ['ok', 'FAQ schema matches the ' + c.faq.length + ' questions on the page'] : ['err', 'Every FAQ question needs an answer']);
    out.push(c.noindex ? ['warn', 'Hidden from Google and the sitemap'] : ['ok', 'Canonical and sitemap set automatically']);
    return out;
  }
  // Errors stop a publish only on pages that have edits; untouched pages are shown as tips.
  function siteChecks() {
    let e = 0, w = 0; const list = [];
    S.pages.forEach((p) => {
      const edited = Object.keys(ov(p.path)).length > 0;
      checksFor(p).forEach((c) => { if (c[0] === 'err' && edited) { e++; list.push([p, c]); } if (c[0] === 'warn' || (c[0] === 'err' && !edited)) w++; });
    });
    return { errors: e, warnings: w, list };
  }

  /* ---------- drafts and publishing ---------- */
  const draftKey = () => 'fp-admin-draft-' + (S.me ? S.me.branch : '');
  const pending = () => JSON.stringify(S.content) !== S.saved;
  function saveDraft() { if (pending()) store.set(draftKey(), { sha: S.sha, content: S.content }); else store.del(draftKey()); }
  function changeCount() {
    const a = (JSON.parse(S.saved).pages || {}), b = S.content.pages || {}, keys = {}; let n = 0;
    Object.keys(a).concat(Object.keys(b)).forEach((k) => { keys[k] = 1; });
    Object.keys(keys).forEach((k) => { if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) n++; });
    return n;
  }
  function publish() {
    const sc = siteChecks();
    if (sc.errors) { toast('Fix ' + sc.errors + ' SEO error' + (sc.errors > 1 ? 's' : '') + ' first: ' + labelOf(sc.list[0][0]) + ', ' + sc.list[0][1][1], true); return; }
    const n = changeCount();
    S.busy = true; render();
    api('content', { method: 'PUT', body: { content: S.content, sha: S.sha, message: 'Admin: ' + n + ' page change' + (n > 1 ? 's' : '') } }).then((d) => {
      S.busy = false;
      if (d._status !== 200) { toast(d.error || 'Could not publish.', true); render(); return; }
      S.sha = d.sha; S.saved = JSON.stringify(S.content); store.del(draftKey());
      toast('Published. The site updates in about 2 minutes.');
      S.activity = null; render();
    });
  }

  /* ---------- loading ---------- */
  function boot() {
    api('me').then((d) => {
      if (d._status === 401) return login();
      if (d._status !== 200) { app.innerHTML = '<div class="login"><form><h1>Admin not ready</h1><p class="err-msg">' + h(d.error || 'The admin API did not answer. It works on the Cloudflare site, not on GitHub Pages.') + '</p></form></div>'; return; }
      S.me = d; load();
    });
  }
  function load() {
    Promise.all([fetch('pages.json', { cache: 'no-store' }).then((r) => r.json()), api('content')]).then((res) => {
      S.meta = res[0]; S.pages = res[0].pages.map((p) => { p.kind = kindOf(p.path); return p; });
      const c = res[1];
      if (c._status !== 200) { toast(c.error || 'Could not load content', true); return; }
      S.content = c.content; S.content.pages = S.content.pages || {};
      S.sha = c.sha; S.saved = JSON.stringify(S.content);
      const dr = store.get(draftKey());
      if (dr && dr.sha === S.sha && JSON.stringify(dr.content) !== S.saved) { S.content = dr.content; toast('Your unpublished changes were kept.'); }
      route(); window.addEventListener('hashchange', route);
    });
  }
  function login(msg) {
    app.innerHTML = '<div class="login"><form id="lf"><a class="brand" href="../" style="padding:0;color:inherit">' + LOGO + '<span><b style="color:#141A2E">FriendsPDF</b><span>Admin</span></span></a><h1>Log in</h1>' +
      (msg ? '<p class="err-msg">' + h(msg) + '</p>' : '') +
      '<div class="fld"><label for="pw" style="font-weight:700;font-size:14px">Password</label><input class="in" id="pw" type="password" autocomplete="current-password" required></div>' +
      '<button class="btn pri" type="submit">Log in</button></form></div>';
    document.getElementById('pw').focus();
    document.getElementById('lf').addEventListener('submit', (e) => {
      e.preventDefault();
      api('login', { method: 'POST', body: { password: document.getElementById('pw').value } }).then((d) => { if (d._status === 200) boot(); else login(d.error || 'Could not log in.'); });
    });
  }
  function route() {
    const hs = decodeURIComponent(location.hash.slice(1));
    if (hs.indexOf('page=') === 0) { S.view = 'pages'; S.path = hs.slice(5) || '/'; } else S.view = hs === 'pages' ? 'pages' : 'dashboard';
    render();
  }

  /* ---------- views ---------- */
  function shell(inner) {
    const nav = [['dashboard', 'Dashboard', 'dash'], ['pages', 'Pages and SEO', 'pages']].map((n) => '<a class="nav" href="#' + n[0] + '"' + (S.view === n[0] ? ' aria-current="page"' : '') + '>' + ico(n[2]) + n[1] + '</a>').join('');
    return '<div class="shell"><aside class="side" aria-label="Admin menu"><a class="brand" href="#dashboard">' + LOGO + '<span><b>FriendsPDF</b><span>Admin</span></span></a>' + nav +
      '<a class="nav" href="../" target="_blank" rel="noopener">' + ico('site') + 'View site</a>' +
      '<div class="side-foot"><span>Saving to <b style="color:#fff">' + h(S.me.branch) + '</b></span><button type="button" data-act="logout">Log out</button></div></aside>' +
      '<main class="main">' + inner + '</main></div>';
  }
  function pubBtn() {
    const n = changeCount();
    return n ? '<button type="button" class="btn pri" data-act="publish"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Publishing…' : 'Publish ' + n + ' change' + (n > 1 ? 's' : '')) + '</button><button type="button" class="btn" data-act="discard">Discard</button>' : '<span class="pill loc">All changes published</span>';
  }

  function dashboard() {
    const sc = siteChecks(), edited = Object.keys(S.content.pages).length;
    const issues = sc.list.slice(0, 5).map((x) => ['err', labelOf(x[0]), x[1][1], '#page=' + encodeURIComponent(x[0].path), 'Fix']);
    const tipPages = S.pages.filter((p) => checksFor(p).some((c) => c[0] !== 'ok' && !(c[0] === 'warn' && current(p).noindex)));
    if (tipPages.length) issues.push(['warn', tipPages.length + ' page' + (tipPages.length > 1 ? 's have' : ' has') + ' an SEO tip', 'Open a page in Pages and SEO to see the checks on the right.', '#pages', 'Review']);
    if (!sc.errors) issues.push(['ok', 'Edited pages pass every SEO check', 'Checked again on every publish, and again when the site builds.', '', '']);
    const acts = S.activity ? (S.activity.length ? S.activity.map((a) => '<div class="log"><p class="t">' + h(a.message) + '</p><p class="d">' + h(a.by) + ' · ' + h(when(a.at)) + '</p></div>').join('') : '<p class="note">No activity yet.</p>') : '<p class="note">Loading…</p>';
    if (!S.activity) api('activity').then((d) => { S.activity = d.items || []; if (S.view === 'dashboard') render(); });
    return '<div class="top"><div><h1>Dashboard</h1><p>' + (S.meta.indexable ? 'Live site' : 'Preview, hidden from Google') + ' · branch ' + h(S.me.branch) + '</p></div><div class="actions"><a class="btn" href="../" target="_blank" rel="noopener">View site</a>' + pubBtn() + '</div></div>' +
      '<div class="grid4">' +
      '<div class="stat"><p class="k">Pages</p><p class="v num">' + S.pages.length + '</p><p class="s" style="color:#535B70;font-weight:500">' + S.pages.filter((p) => !current(p).noindex).length + ' in the sitemap</p></div>' +
      '<div class="stat"><p class="k">Pages you edited</p><p class="v num">' + edited + '</p><p class="s" style="color:#535B70;font-weight:500">the rest use the default text</p></div>' +
      '<div class="stat"><p class="k">SEO errors</p><p class="v num" style="color:' + (sc.errors ? '#B4233C' : '#067647') + '">' + sc.errors + '</p><p class="s" style="color:#8A5300">' + sc.warnings + ' tip' + (sc.warnings === 1 ? '' : 's') + '</p></div>' +
      '<div class="stat"><p class="k">Built</p><p class="v num" style="font-size:20px">' + h(when(S.meta.builtAt)) + '</p><p class="s" style="color:#535B70;font-weight:500">last deploy of this branch</p></div></div>' +
      '<div class="row"><section class="card" style="flex:3 1 520px" aria-labelledby="ti"><h2 id="ti">To improve</h2><p class="lead">Errors stop a publish. Tips help rankings.</p>' +
      issues.map((i) => '<div class="issue"><span class="dot ' + i[0] + '">' + (i[0] === 'ok' ? '✓' : '!') + '</span><div style="flex:1"><p class="t">' + h(i[1]) + '</p><p class="d">' + h(i[2]) + '</p></div>' + (i[3] ? '<a class="lnk" href="' + i[3] + '">' + i[4] + '</a>' : '') + '</div>').join('') +
      '</section><section class="card" style="flex:2 1 340px" aria-labelledby="ra"><h2 id="ra">Recent activity</h2>' + acts + '</section></div>';
  }

  function pagesView() {
    const p = pageBy(S.path) || S.pages[0], c = current(p), d = p.defaults;
    S.path = p.path;
    if (S.tab === 'faq' && !d.hasFaq) S.tab = 'seo';
    const counts = { All: S.pages.length }; S.pages.forEach((x) => { counts[x.kind] = (counts[x.kind] || 0) + 1; });
    const saved = JSON.parse(S.saved).pages || {};
    const list = S.pages.filter((x) => (S.filter === 'All' || x.kind === S.filter) && (!S.q || (labelOf(x) + ' ' + x.path).toLowerCase().indexOf(S.q.toLowerCase()) >= 0))
      .map((x) => { const dirty = JSON.stringify(saved[x.path]) !== JSON.stringify(S.content.pages[x.path]); return '<a class="pitem" href="#page=' + encodeURIComponent(x.path) + '"' + (x.path === p.path ? ' aria-current="page"' : '') + '><b>' + h(labelOf(x)) + '</b><span>' + h(x.path) + (dirty ? ' · draft' : '') + '</span></a>'; }).join('');
    const meter = (n, lo, hi, max) => '<div class="meter ' + (n < lo || n > max ? 'err' : n > hi ? 'warn' : '') + '"><i style="width:' + Math.min(100, Math.round(n / hi * 100)) + '%"></i></div>';
    const cnt = (n, lo, hi, max) => '<span class="count num ' + (n < lo || n > max ? 'err' : n > hi ? 'warn' : 'ok') + '">' + n + ' / ' + hi + ' characters</span>';
    const seo = '<section class="card" style="display:flex;flex-direction:column;gap:20px" aria-labelledby="sr"><h2 id="sr">Search result</h2>' +
      '<div class="fld"><div class="fld-h"><label for="f-title">Meta title</label>' + cnt(len(c.title), 20, 65, 78) + '</div><input class="in" id="f-title" data-f="title" value="' + h(c.title) + '">' + meter(len(c.title), 20, 65, 78) + '</div>' +
      '<div class="fld"><div class="fld-h"><label for="f-description">Meta description</label>' + cnt(len(c.description), 70, 160, 175) + '</div><textarea class="ta" id="f-description" data-f="description" rows="3">' + h(c.description) + '</textarea>' + meter(len(c.description), 70, 160, 175) + '</div>' +
      '<div class="g2"><div class="fld"><label for="f-slug" style="font-size:14px;font-weight:700">Page address</label><input class="in" id="f-slug" value="' + h(p.path) + '" readonly><p class="note">Locked, so old links and rankings keep working.</p></div>' +
      '<div class="fld"><label for="f-canon" style="font-size:14px;font-weight:700">Canonical</label><input class="in" id="f-canon" value="' + h(S.meta.siteUrl + (p.path === '/' ? '/' : p.path)) + '" readonly><p class="note">Set automatically from the address.</p></div></div>' +
      '<label class="chk"><input type="checkbox" data-f="index"' + (c.noindex ? '' : ' checked') + '>Show in Google (index and sitemap)</label>' +
      '<div><button type="button" class="lnk" data-act="reset" data-keys="title,description,noindex">Reset title, description and indexing to the default</button></div></section>';
    const text = '<section class="card" style="display:flex;flex-direction:column;gap:16px" aria-labelledby="pt"><h2 id="pt">Page text</h2>' +
      '<div class="fld"><label for="f-h1" style="font-size:14px;font-weight:700">Heading (H1)</label><input class="in" id="f-h1" data-f="h1" value="' + h(c.h1) + '"' + (d.h1Editable ? '' : ' readonly') + '><p class="note">' + (d.h1Editable ? 'Put **two stars** around words that should be highlighted in blue.' : 'This page builds its heading in the browser, so it cannot be edited here.') + '</p></div>' +
      '<div class="fld"><label for="f-extra" style="font-size:14px;font-weight:700">Extra text, shown above the questions</label><div class="toolbar" role="toolbar" aria-label="Text format"><button type="button" data-wrap="strong" aria-label="Bold">B</button><button type="button" data-wrap="em" aria-label="Italic"><i>I</i></button><button type="button" data-wrap="h2">H2</button><button type="button" data-wrap="p">Para</button><button type="button" data-wrap="li">List item</button><button type="button" data-wrap="a">Link</button></div><textarea class="ta mono" id="f-extra" data-f="extra" rows="8" placeholder="&lt;h2&gt;When to use this tool&lt;/h2&gt;&#10;&lt;p&gt;Short, helpful text for your visitors…&lt;/p&gt;">' + h(c.extra) + '</textarea><p class="note">Allowed: headings, paragraphs, lists, bold, italic and links.</p></div>' +
      '<div><button type="button" class="lnk" data-act="reset" data-keys="h1,extra">Reset heading and text to the default</button></div></section>';
    const faq = '<section class="card" style="display:flex;flex-direction:column;gap:12px" aria-labelledby="fq"><h2 id="fq">Questions (FAQ)</h2><p class="lead">Shown on the page and sent to Google as FAQ schema. Plain text answers.</p>' +
      c.faq.map((x, i) => '<div class="faq-item"><div class="fld"><label for="q' + i + '" style="font-size:13px;font-weight:700">Question ' + (i + 1) + '</label><input class="in" id="q' + i + '" data-faq="' + i + '" data-k="q" value="' + h(x.q) + '"></div><div class="fld"><label for="a' + i + '" style="font-size:13px;font-weight:700">Answer</label><textarea class="ta" id="a' + i + '" rows="3" data-faq="' + i + '" data-k="a">' + h(x.a) + '</textarea></div><div class="bar"><button type="button" class="btn sm" data-fmove="' + i + '" data-dir="-1"' + (i ? '' : ' disabled') + '>Move up</button><button type="button" class="btn sm" data-fmove="' + i + '" data-dir="1"' + (i < c.faq.length - 1 ? '' : ' disabled') + '>Move down</button><button type="button" class="btn sm" data-fdel="' + i + '"' + (c.faq.length <= 1 ? ' disabled' : '') + '>Remove</button></div></div>').join('') +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn" data-act="faq-add"' + (c.faq.length >= 20 ? ' disabled' : '') + '>Add a question</button><button type="button" class="lnk" data-act="reset" data-keys="faq">Reset questions to the default</button></div></section>';
    const checks = checksFor(p), nOk = checks.filter((x) => x[0] === 'ok').length, nBad = checks.length - nOk;
    const side = '<section class="card" aria-labelledby="gp"><h2 id="gp" style="font-size:15px">Google preview</h2><div class="gp" style="margin-top:14px"><div class="site"><span style="width:26px;height:26px;border-radius:13px;background:#1D4ED8;display:flex;align-items:center;justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/></svg></span><span style="line-height:1.2"><b>FriendsPDF</b><span>' + h(S.meta.siteUrl.replace(/^https?:\/\//, '') + (p.path === '/' ? '' : ' › ' + p.path.replace(/^\/|\/$/g, '').split('/').join(' › '))) + '</span></span></div><p class="gt">' + h(c.title) + '</p><p class="gd">' + h(c.description) + '</p></div></section>' +
      '<section class="card" aria-labelledby="ck"><h2 id="ck" style="font-size:15px">SEO checks <span style="font-weight:600;color:' + (checks.some((x) => x[0] === 'err') ? '#B4233C' : '#067647') + '">· ' + nOk + ' pass' + (nBad ? ', ' + nBad + ' to look at' : '') + '</span></h2><ul class="checks">' +
      checks.map((x) => '<li><span class="i-' + x[0] + '">' + (x[0] === 'ok' ? '✓' : '!') + '</span><span>' + h(x[1]) + '</span></li>').join('') + '</ul></section>' +
      '<p class="note">Publishing runs every check again. If one fails when the site builds, nothing goes live.</p>';
    const tabs = [['seo', 'SEO'], ['text', 'Page text']].concat(d.hasFaq ? [['faq', 'FAQ (' + c.faq.length + ')']] : []);
    return '<div class="editor"><nav class="plist" aria-label="Pages"><label for="pq">Find a page</label><input class="in" id="pq" type="search" placeholder="Merge, compress, exam…" value="' + h(S.q) + '">' +
      '<div class="chips">' + ['All', 'Home', 'Tools', 'Guides', 'Legal'].map((k) => '<button type="button" class="chip' + (S.filter === k ? ' on' : '') + '" aria-pressed="' + (S.filter === k) + '" data-filter="' + k + '">' + k + ' ' + (counts[k] || 0) + '</button>').join('') + '</div>' + list + '</nav>' +
      '<div class="pedit"><div class="top"><div><h1 style="font-size:24px">' + h(labelOf(p)) + '</h1><p><a href="' + h(S.meta.siteUrl + p.path) + '" target="_blank" rel="noopener">' + h(S.meta.siteUrl.replace(/^https?:\/\//, '') + p.path) + '</a></p></div><div class="actions">' + pubBtn() + '</div></div>' +
      '<div class="tabs" role="tablist" aria-label="Editor sections">' + tabs.map((t) => '<button type="button" role="tab" class="tab' + (S.tab === t[0] ? ' on' : '') + '" aria-selected="' + (S.tab === t[0]) + '" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
      (S.tab === 'seo' ? seo : S.tab === 'text' ? text : faq) + '</div><aside class="pside" aria-label="Preview and checks">' + side + '</aside></div>';
  }

  // Redraw, keeping the cursor where it was in the field being typed in.
  function render() {
    if (!S.me || !S.content) return;
    const a = document.activeElement, id = a && a.id, from = a && a.selectionStart, to = a && a.selectionEnd, sy = window.scrollY;
    app.innerHTML = shell(S.view === 'pages' ? pagesView() : dashboard());
    if (id) { const el = document.getElementById(id); if (el) { el.focus(); try { el.setSelectionRange(from, to); } catch (e) { /* not a text field */ } } }
    window.scrollTo(0, sy);
  }

  /* ---------- events ---------- */
  function faqOf(path) { return clone(current(pageBy(path)).faq); }
  function wrapSelection(tag) {
    const ta = document.getElementById('f-extra'); if (!ta) return;
    const a = ta.selectionStart, b = ta.selectionEnd, sel = ta.value.slice(a, b) || 'text';
    let open = '<' + tag + '>', close = '</' + tag + '>';
    if (tag === 'a') { const url = window.prompt('Link address (https://…)', 'https://'); if (!url) return; open = '<a href="' + url.replace(/"/g, '') + '">'; }
    ta.value = ta.value.slice(0, a) + open + sel + close + ta.value.slice(b);
    setField(S.path, 'extra', ta.value); render();
  }
  app.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act],[data-tab],[data-filter],[data-fmove],[data-fdel],[data-wrap]'); if (!t) return;
    const act = t.dataset.act;
    if (act === 'publish') return publish();
    if (act === 'discard') { if (window.confirm('Throw away your unpublished changes?')) { S.content = JSON.parse(S.saved); saveDraft(); render(); } return; }
    if (act === 'logout') { api('logout', { method: 'POST' }).then(() => location.reload()); return; }
    if (act === 'reset') { t.dataset.keys.split(',').forEach((k) => setField(S.path, k, k === 'noindex' ? false : k === 'extra' ? '' : pageBy(S.path).defaults[k])); return render(); }
    if (act === 'faq-add') { const f = faqOf(S.path); f.push({ q: '', a: '' }); setField(S.path, 'faq', f); return render(); }
    if (t.dataset.tab) { S.tab = t.dataset.tab; return render(); }
    if (t.dataset.filter) { S.filter = t.dataset.filter; return render(); }
    if (t.dataset.wrap) return wrapSelection(t.dataset.wrap);
    if (t.dataset.fdel != null) { const f = faqOf(S.path); f.splice(Number(t.dataset.fdel), 1); setField(S.path, 'faq', f); return render(); }
    if (t.dataset.fmove != null) { const f = faqOf(S.path), i = Number(t.dataset.fmove), j = i + Number(t.dataset.dir); if (j < 0 || j >= f.length) return; const x = f[i]; f[i] = f[j]; f[j] = x; setField(S.path, 'faq', f); render(); }
  });
  app.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'pq') { S.q = t.value; return render(); }
    if (t.dataset.f && t.dataset.f !== 'index') { setField(S.path, t.dataset.f, t.value); return render(); }
    if (t.dataset.faq != null) { const f = faqOf(S.path); f[Number(t.dataset.faq)][t.dataset.k] = t.value; setField(S.path, 'faq', f); render(); }
  });
  app.addEventListener('change', (e) => {
    if (e.target.dataset.f === 'index') { setField(S.path, 'noindex', !e.target.checked); render(); }
  });
  window.addEventListener('beforeunload', (e) => { if (S.content && pending()) { e.preventDefault(); e.returnValue = ''; } });

  boot();
})();
