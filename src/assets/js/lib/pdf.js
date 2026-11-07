// pdf-lib (write) and PDF.js (read/render) helpers.
import * as PDFLib from '../../vendor/pdf-lib.esm.min.js';
import { UserError } from './util.js';
export { PDFLib, UserError };

let pdfjsPromise;
export function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('../../vendor/pdfjs/pdf.min.mjs').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/** Open a PDF with PDF.js for rendering. Rejects password-protected files with a friendly message. */
export async function openForRender(bytes) {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({
    data: bytes.slice(0), // PDF.js transfers the buffer; keep ours intact
    isEvalSupported: false,
    standardFontDataUrl: new URL('../../vendor/pdfjs/standard_fonts/', import.meta.url).href,
    cMapUrl: new URL('../../vendor/pdfjs/cmaps/', import.meta.url).href,
    cMapPacked: true
  });
  task.onPassword = () => { task.destroy(); };
  try {
    return await task.promise;
  } catch (e) {
    if (e && (e.name === 'PasswordException' || /password/i.test(e.message))) throw new UserError('This PDF is password-protected. Remove the password first, then try again.');
    throw new UserError('This file could not be opened as a PDF. It may be damaged.');
  }
}

/** Open a PDF with pdf-lib for editing. */
export async function openForEdit(bytes) {
  try {
    return await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    if (e && /encrypt/i.test(e.message || e.name)) throw new UserError('This PDF is password-protected. Remove the password first, then try again.');
    throw new UserError('This file could not be opened as a PDF. It may be damaged.');
  }
}

/** Render one page into a canvas. `target` = { scale } or { maxWidth } (CSS px). `rotationDelta` adds to the page's own rotation. */
export async function renderPage(doc, pageNo, target, rotationDelta = 0) {
  const page = await doc.getPage(pageNo);
  const rotation = (page.rotate + rotationDelta + 360) % 360;
  const base = page.getViewport({ scale: 1, rotation });
  let scale = target.scale || 1;
  if (target.maxWidth) scale = target.maxWidth / base.width;
  if (target.maxSide) scale = target.maxSide / Math.max(base.width, base.height);
  // Keep canvases within mobile limits (about 16 megapixels).
  const maxPixels = target.maxPixels || 16e6;
  if (base.width * base.height * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (base.width * base.height));
  const vp = page.getViewport({ scale, rotation });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(vp.width));
  canvas.height = Math.max(1, Math.floor(vp.height));
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp, background: 'rgb(255,255,255)' }).promise;
  page.cleanup();
  return canvas;
}

export function freeCanvas(c) { if (c) { c.width = 0; c.height = 0; } }

export async function savePdf(doc) {
  doc.setProducer('FriendsPDF (friendspdf.com)');
  doc.setCreator('FriendsPDF');
  return doc.save({ useObjectStreams: true });
}
