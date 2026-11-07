// Shrink a PDF below a byte target. Strategy:
// 1) keep the original if it already fits, 2) try a lossless re-save (keeps text),
// 3) otherwise re-draw pages as JPEG images, searching resolution + quality to land just under the target.
import { PDFLib, openForRender, renderPage, freeCanvas, savePdf } from './pdf.js';
import { canvasToBlob, toneCanvas } from './images.js';
import { nextFrame } from './util.js';

const Q_LADDER = [0.85, 0.7, 0.55, 0.4, 0.28];
const DPI_LADDER = [200, 175, 150, 130, 115, 100, 90, 80, 72, 64, 56, 48, 42, 36, 30];
const EXP = 1.7; // JPEG bytes grow ~ pixels^0.85

async function rasterBuild(src, n, dpi, q, gray, onProgress, stepBase, stepTotal) {
  const out = await PDFLib.PDFDocument.create();
  for (let i = 1; i <= n; i++) {
    const page = await src.getPage(i);
    const vp = page.getViewport({ scale: 1, rotation: page.rotate });
    const canvas = await renderPage(src, i, { scale: dpi / 72, maxPixels: 12e6 });
    if (gray) toneCanvas(canvas, { gray: true });
    const blob = await canvasToBlob(canvas, 'image/jpeg', q);
    freeCanvas(canvas);
    const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const p = out.addPage([vp.width, vp.height]);
    p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
    onProgress && onProgress(stepBase + i, stepTotal);
    await nextFrame();
  }
  return savePdf(out);
}

async function estimate(src, n, gray) {
  // Bytes per quality step at 72 dpi, summed over pages (sampled when there are many pages).
  const sample = n <= 6 ? [...Array(n).keys()].map((i) => i + 1) : [1, Math.ceil(n / 3), Math.ceil((2 * n) / 3), n];
  const sums = Q_LADDER.map(() => 0);
  for (const i of sample) {
    const canvas = await renderPage(src, i, { scale: 1 });
    if (gray) toneCanvas(canvas, { gray: true });
    for (let k = 0; k < Q_LADDER.length; k++) sums[k] += (await canvasToBlob(canvas, 'image/jpeg', Q_LADDER[k])).size;
    freeCanvas(canvas);
  }
  const factor = n / sample.length;
  return sums.map((s) => s * factor);
}

function pick(est, n, budget, maxDpi) {
  const predict = (dpi, k) => est[k] * Math.pow(dpi / 72, EXP) + 900 * n + 1500;
  const dpis = DPI_LADDER.filter((d) => d <= maxDpi);
  for (const dpi of dpis) {
    if (dpi < 90) break;
    for (let k = 0; k <= 2; k++) if (predict(dpi, k) <= budget) return { dpi, k };
  }
  for (const dpi of dpis) for (let k = 0; k < Q_LADDER.length; k++) if (predict(dpi, k) <= budget) return { dpi, k };
  return { dpi: dpis[dpis.length - 1], k: Q_LADDER.length - 1 };
}

/**
 * bytes: Uint8Array. opts: { targetBytes (number or null for "recommended"), gray, onProgress(done,total) }
 * Returns { bytes, pages, method: 'original'|'lossless'|'raster', soft, reached, dpi, q }
 */
export async function compressPdf(bytes, { targetBytes = null, gray = false, onProgress } = {}) {
  const original = bytes.length;
  // Lossless attempt (also validates the file and reveals password protection).
  let lossless = null;
  try {
    const doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
    lossless = await savePdf(doc);
  } catch (e) {
    if (e && /encrypt/i.test(e.message || '')) { const { UserError } = await import('./util.js'); throw new UserError('This PDF is password-protected. Remove the password first, then try again.'); }
    lossless = null; // pdf-lib cannot parse it; PDF.js may still render it
  }
  const bestLossless = lossless && lossless.length < original ? lossless : bytes;
  if (targetBytes && !gray) {
    if (original <= targetBytes) return { bytes, method: 'original', soft: false, reached: true };
    if (bestLossless.length <= targetBytes) return { bytes: bestLossless, method: 'lossless', soft: false, reached: true };
  }

  const src = await openForRender(bytes);
  const n = src.numPages;
  try {
    const est = await estimate(src, n, gray);
    if (!targetBytes) {
      // Recommended: clear text, solid savings.
      const out = await rasterBuild(src, n, 130, 0.7, gray, onProgress, 0, n);
      if (!gray && out.length >= bestLossless.length * 0.92) return { bytes: bestLossless, pages: n, method: bestLossless === bytes ? 'original' : 'lossless', soft: false, reached: true };
      return { bytes: out, pages: n, method: 'raster', soft: false, reached: true, dpi: 130, q: 0.7 };
    }
    const budget = targetBytes * 0.95;
    let { dpi, k } = pick(est, n, budget, 200);
    let best = null; // smallest result that fits
    let smallest = null;
    const tries = 7;
    for (let t = 0; t < tries; t++) {
      const out = await rasterBuild(src, n, dpi, Q_LADDER[k], gray, onProgress, t * n, tries * n);
      if (!smallest || out.length < smallest.bytes.length) smallest = { bytes: out, dpi, q: Q_LADDER[k] };
      if (out.length <= targetBytes) {
        if (!best || out.length > best.bytes.length) best = { bytes: out, dpi, q: Q_LADDER[k] };
        // Close enough to the limit, or already at the top: stop.
        if (out.length > targetBytes * 0.7 || dpi >= 200) break;
        // Plenty of room left: try one notch sharper once.
        const higher = DPI_LADDER[Math.max(0, DPI_LADDER.indexOf(dpi) - 1)];
        if (higher === dpi || (best && best.dpi > dpi)) break;
        dpi = higher;
        continue;
      }
      if (best) break; // the sharper try overshot; keep the earlier fit
      // Too big: scale down using the measured ratio.
      const ratio = (targetBytes * 0.93) / out.length;
      const nextDpi = dpi * Math.pow(ratio, 1 / EXP);
      if (k < 2 && ratio > 0.75) k++;
      else {
        const lower = DPI_LADDER.find((d) => d <= nextDpi) || DPI_LADDER[DPI_LADDER.length - 1];
        if (lower === dpi) { if (k < Q_LADDER.length - 1) k++; else break; } else dpi = lower;
      }
    }
    onProgress && onProgress(1, 1);
    const chosen = best || smallest;
    return { bytes: chosen.bytes, pages: n, method: 'raster', dpi: chosen.dpi, q: chosen.q, soft: chosen.dpi < 90 || chosen.q < 0.5, reached: !!best };
  } finally {
    src.destroy();
  }
}
