// Load a single PDF and show page thumbnails (rendered lazily as they scroll into view).
import { el, readBytes, isPdf, UserError } from './util.js';
import { openForRender, openForEdit, renderPage } from './pdf.js';

export async function loadSinglePdf(files) {
  const file = files.find(isPdf);
  if (!file) throw new UserError('Please choose a PDF file.');
  const bytes = await readBytes(file);
  const edit = await openForEdit(bytes); // validates + catches password protection early
  const view = await openForRender(bytes);
  return { file, bytes, edit, view, n: view.numPages };
}

/** Render thumbnails lazily into elements returned by getSlot(i) (0-based). */
export function lazyThumbs(view, n, getSlot, size = 220) {
  const done = new Set();
  const queue = [];
  let running = false;
  const pump = async () => {
    if (running) return;
    running = true;
    while (queue.length) {
      const i = queue.shift();
      if (done.has(i)) continue;
      done.add(i);
      try {
        const c = await renderPage(view, i + 1, { maxSide: size * (window.devicePixelRatio > 1 ? 1.6 : 1) });
        const slot = getSlot(i);
        if (slot) { slot.querySelector('canvas, .ph')?.remove(); slot.append(c); }
      } catch { /* a bad page should not stop the rest */ }
    }
    running = false;
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { const i = +e.target.dataset.page; if (!done.has(i)) { queue.push(i); io.unobserve(e.target); } }
    pump();
  }, { rootMargin: '400px' }) : null;
  return {
    observe(i, node) { node.dataset.page = i; if (io) io.observe(node); else { queue.push(i); pump(); } },
    disconnect() { io && io.disconnect(); }
  };
}

export const placeholder = () => el('span', { class: 'ph', 'aria-hidden': 'true' });
