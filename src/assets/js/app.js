// Runs on every page: mobile menu, install prompt (PWA), service worker.
const rel = document.body.dataset.rel || './';

// ---- mobile menu ----
const menuBtn = document.querySelector('.menu-btn');
const menu = document.getElementById('mobile-menu');
if (menuBtn && menu) {
  menuBtn.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus(); } });
}

// ---- install (PWA) ----
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let deferred = null;

function showInstall(on) {
  document.querySelectorAll('[data-install]').forEach((b) => { b.hidden = !on; });
  const banner = document.querySelector('[data-install-banner]');
  if (banner) banner.hidden = !on;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  if (!standalone) showInstall(true);
});
window.addEventListener('appinstalled', () => { deferred = null; showInstall(false); });
if (isIOS && !standalone) showInstall(true);

async function install() {
  if (deferred) {
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    deferred = null;
    showInstall(false);
    return;
  }
  helpDialog();
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-install], [data-install-help]');
  if (t) { e.preventDefault(); install(); }
});

function helpDialog() {
  const d = document.createElement('dialog');
  d.className = 'ios-help';
  d.setAttribute('aria-labelledby', 'ih-title');
  const steps = isIOS
    ? ['Tap the <b>Share</b> button in Safari (the square with an arrow).', 'Scroll down and tap <b>Add to Home Screen</b>.', 'Tap <b>Add</b>. FriendsPDF now opens like an app.']
    : standalone
      ? ['FriendsPDF is already installed on this device.']
      : ['Open your browser menu (⋮ or ⋯).', 'Tap <b>Install app</b> or <b>Add to Home screen</b>.', 'FriendsPDF now opens like an app, even offline.'];
  d.innerHTML = `<h2 id="ih-title" class="h3">Add to home screen</h2><ol>${steps.map((s) => `<li>${s}</li>`).join('')}</ol><button type="button" class="btn btn-primary btn-block">OK</button>`;
  d.querySelector('button').addEventListener('click', () => d.close());
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
}

// ---- service worker (offline support) ----
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(rel + 'sw.js', { scope: rel }).catch(() => { /* offline support is optional */ });
  });
}
