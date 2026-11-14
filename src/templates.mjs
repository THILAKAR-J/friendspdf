import { SITE, TOOLS, CATS, POPULAR_SEARCHES } from './site.mjs';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Allow the small set of tags we write ourselves in copy (strong only).
export const rich = (s) => esc(s).replace(/&lt;(\/?)strong&gt;/g, '<$1strong>');

export const ICON = {
  logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  form: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
  plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
  noCloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M8.5 8.2A5 5 0 0 0 7 8a4 4 0 0 0 0 8h10"/><path d="M15 6.5A6 6 0 0 1 21 13a4 4 0 0 1-1 2.6"/></svg>'
};

export const toolBySlug = (slug) => TOOLS.find((t) => t.slug === slug);

export function toolTile(t, rel, extraClass = '') {
  const badge = t.popular ? '<span class="tile-badge dark">Popular</span>' : t.forms ? '<span class="tile-badge violet">Forms</span>' : '';
  return `<a class="tile cat-${t.cat} ${extraClass}" href="${rel}${t.slug}/" data-search="${esc((t.name + ' ' + t.desc + ' ' + t.slug.replace(/-/g, ' ')).toLowerCase())}" data-cat="${t.cat}">
  <span class="tile-icon${[...t.tag].length === 1 ? ' sym' : ''}" aria-hidden="true">${esc(t.tag)}</span>
  <strong class="tile-name">${esc(t.name)}</strong>
  <span class="tile-desc">${esc(t.desc)}</span>${badge}
</a>`;
}

export function soonTile(t) {
  return `<div class="tile soon cat-${t.cat}" data-search="${esc((t.name + ' ' + t.desc).toLowerCase())}" data-cat="${t.cat}">
  <span class="tile-icon${[...t.tag].length === 1 ? ' sym' : ''}" aria-hidden="true">${esc(t.tag)}</span>
  <strong class="tile-name">${esc(t.name)}</strong>
  <span class="tile-desc">${esc(t.desc)}</span><span class="tile-badge soonb">Coming soon</span>
</div>`;
}

export function header(active, rel) {
  const links = [
    ['tools', 'All tools', 'tools/'],
    ['forms', 'Exam forms', 'exam-forms/'],
    ['guide', 'Help me choose', 'help-me-choose/'],
    ['privacy', 'Privacy', 'privacy/']
  ];
  const nav = links.map(([id, label, href]) => `<a href="${rel}${href}"${id === active ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container header-row">
    <a class="logo" href="${rel}" aria-label="FriendsPDF home"><span class="logo-mark">${ICON.logo}</span><span>Friends<b>PDF</b></span></a>
    <nav class="main-nav" aria-label="Main">${nav}</nav>
    <div class="header-actions">
      <a class="search-pill" href="${rel}tools/#search">${ICON.search}<span>Search tools</span></a>
      <a class="icon-btn search-icon" href="${rel}tools/#search" aria-label="Search tools">${ICON.search}</a>
      <button class="btn btn-dark install-btn" type="button" data-install hidden>${ICON.download}Install app</button>
      <button class="icon-btn menu-btn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu">${ICON.menu}</button>
    </div>
  </div>
  <div class="mobile-menu" id="mobile-menu" hidden>
    <nav class="container" aria-label="Mobile">
      <a href="${rel}">Home</a>${nav}<a href="${rel}recent/">Recent files</a>
      <button class="btn btn-dark" type="button" data-install hidden>${ICON.download}Install app</button>
    </nav>
  </div>
</header>`;
}

export function footer(rel) {
  const L = (label, slug) => `<a href="${rel}${slug}/">${label}</a>`;
  const cols = [
    ['Convert', [L('JPG to PDF', 'jpg-to-pdf'), L('PNG to PDF', 'png-to-pdf'), L('PDF to JPG', 'pdf-to-jpg')]],
    ['Organize', [L('Merge PDF', 'merge-pdf'), L('Split PDF', 'split-pdf'), L('Rotate PDF', 'rotate-pdf'), L('Add page numbers', 'add-page-numbers')]],
    ['For forms', [L('Compress PDF to KB', 'compress-pdf-to-kb'), L('Resize photo to KB', 'resize-image-to-kb'), L('Signature resize', 'signature-resize'), L('Exam size guide', 'exam-forms')]],
    ['FriendsPDF', [L('All tools', 'tools'), L('Help me choose', 'help-me-choose'), L('Recent files', 'recent'), L('Privacy', 'privacy'), L('Terms', 'terms')]]
  ];
  const colHtml = cols.map(([t, ls]) => `<nav aria-label="${t}"><h2 class="foot-h">${t}</h2>${ls.join('')}</nav>`).join('');
  const pop = POPULAR_SEARCHES.map(([label, slug]) => `<a href="${rel}${slug}/">${label}</a>`).join('');
  return `<footer class="site-footer">
  <div class="container">
    <div class="foot-grid">
      <div><p class="foot-brand">Friends<b>PDF</b></p><p class="muted">Free PDF tools that work on your phone. Your files never leave your device.</p></div>
      ${colHtml}
    </div>
    <div class="foot-pop"><h2 class="foot-h">Popular searches</h2><div class="chips">${pop}</div></div>
    <div class="foot-bottom"><span>© 2026 FriendsPDF</span><span class="ok-line">${ICON.shield}Files are processed on your device. Nothing is uploaded.</span></div>
  </div>
</footer>`;
}

export function tabBar(active, rel) {
  const item = (id, label, href, icon) => `<a href="${rel}${href}"${id === active ? ' aria-current="page"' : ''}>${icon}<span>${label}</span></a>`;
  return `<nav class="tab-bar" aria-label="App">
  ${item('home', 'Home', '', ICON.home)}
  ${item('tools', 'Tools', 'tools/', ICON.grid)}
  <a class="tab-fab" href="${rel}help-me-choose/" aria-label="Start: help me choose a tool">${ICON.plus}</a>
  ${item('recent', 'Recent', 'recent/', ICON.clock)}
  ${item('forms', 'Forms', 'exam-forms/', ICON.form)}
</nav>`;
}

export function faqList(faq) {
  return faq.map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n');
}

export function breadcrumbs(items, rel) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map(([label, href], i) => i === items.length - 1 ? `<li aria-current="page">${esc(label)}</li>` : `<li><a href="${rel}${href}">${esc(label)}</a></li>`).join('')}</ol></nav>`;
}

export function layout({ page, rel, body, active, tab, scripts = [], jsonld = [], indexing, siteIndexing = indexing, assetV, bodyClass = '' }) {
  const canonical = SITE.url + '/' + (page.path || '');
  // Live site: a hidden page is still crawled for its links (noindex, follow). Previews: hidden completely.
  const robots = indexing ? 'index, follow, max-image-preview:large' : siteIndexing ? 'noindex, follow' : 'noindex, nofollow';
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
  const scr = ['assets/js/app.js', ...scripts].map((s) => `<script type="module" src="${rel}${s}?v=${assetV}"></script>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.desc)}">
${page.keywords ? `<meta name="keywords" content="${esc(page.keywords)}">\n` : ''}<meta name="robots" content="${robots}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${esc(page.ogTitle || page.title)}">
<meta property="og:description" content="${esc(page.desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE.url}/assets/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${SITE.themeColor}">
<link rel="manifest" href="${rel}manifest.webmanifest">
<link rel="icon" href="${rel}favicon.ico" sizes="32x32">
<link rel="icon" href="${rel}assets/img/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${rel}assets/img/apple-touch-icon.png">
<meta name="apple-mobile-web-app-title" content="${SITE.name}">
<link rel="preload" href="${rel}assets/fonts/pjs-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${rel}assets/fonts/pjs-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${rel}assets/css/style.css?v=${assetV}">
${ld}
</head>
<body class="${bodyClass}" data-rel="${rel}">
${header(active, rel)}
<main id="main">
${body}
</main>
${footer(rel)}
${tabBar(tab, rel)}
<div class="toast" role="status" aria-live="polite" hidden></div>
${scr}
</body>
</html>
`;
}
