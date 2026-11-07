// Entry for every tool page: wires the drop zone, then hands files to the tool engine.
import { presetFromPage, toast, el, UserError } from './lib/util.js';

const app = document.getElementById('app');
if (app) init();

function init() {
  const engineName = app.dataset.engine;
  const preset = presetFromPage(app);
  const enginePromise = import(`./tools/${engineName}.js`);
  let started = false;

  const start = async (files) => {
    if (!files.length || started) return;
    started = true;
    try {
      const engine = await enginePromise;
      await engine.start(app, files, preset);
    } catch (e) {
      started = false;
      if (e instanceof UserError) showError(e.message);
      else { console.error(e); showError('This file could not be opened. Please try another file.'); }
    }
  };

  for (const input of app.querySelectorAll('input[data-pick]')) {
    input.addEventListener('change', () => { const f = [...(input.files || [])]; input.value = ''; start(f); });
  }
  const zone = app.querySelector('[data-drop]');
  if (zone) {
    let depth = 0;
    zone.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; zone.classList.add('over'); });
    zone.addEventListener('dragover', (e) => e.preventDefault());
    zone.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) zone.classList.remove('over'); });
    zone.addEventListener('drop', (e) => { e.preventDefault(); depth = 0; zone.classList.remove('over'); start([...(e.dataTransfer?.files || [])]); });
  }
  // Dropping a file anywhere else must not navigate away from the page.
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!started && e.dataTransfer && e.dataTransfer.files.length && !(zone && zone.contains(e.target))) start([...e.dataTransfer.files]);
  });
  function showError(msg) {
    let box = app.querySelector('.alert');
    if (!box) { box = el('p', { class: 'alert err', role: 'alert' }); app.append(box); }
    box.textContent = msg;
    toast(msg);
  }
  // Warm the engine early so the first tap feels instant, and so the tool keeps working offline.
  enginePromise.catch(() => {});
  if (engineName !== 'resize') {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    idle(() => {
      import('./lib/pdf.js').then((m) => m.loadPdfJs()).catch(() => {});
      fetch(new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url)).catch(() => {});
    });
  }
}
