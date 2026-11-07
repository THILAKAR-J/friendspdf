import { isHeic, UserError } from './util.js';

/** Decode an image file. Browsers apply the photo's EXIF rotation when decoding into <img>. */
export function decodeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight, url, close: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      if (isHeic(file)) reject(new UserError(`"${file.name}" is an iPhone HEIC photo that this browser cannot open. On iPhone, pick it from Photos in Safari (it converts to JPG), or set Camera › Formats › Most Compatible.`));
      else reject(new UserError(`"${file.name}" could not be opened as an image.`));
    };
    img.src = url;
  });
}

/**
 * Draw an image onto a new canvas.
 * opts: rotate (0/90/180/270), maxSide (px), maxPixels, gray (bool), cleanBg (bool, pushes light greys to white), width/height (exact output size).
 */
export function imageToCanvas(img, opts = {}) {
  const rot = ((opts.rotate || 0) % 360 + 360) % 360;
  const swap = rot === 90 || rot === 270;
  let w = swap ? img.height : img.width;
  let h = swap ? img.width : img.height;
  let scale = 1;
  if (opts.maxSide) scale = Math.min(scale, opts.maxSide / Math.max(w, h));
  const maxPixels = opts.maxPixels || 16e6;
  if (w * h * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (w * h));
  if (opts.scale) scale = opts.scale;
  let cw = Math.max(1, Math.round(w * scale));
  let ch = Math.max(1, Math.round(h * scale));
  if (opts.width && opts.height) { cw = Math.round(opts.width); ch = Math.round(opts.height); }
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: !!(opts.gray || opts.cleanBg) });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingQuality = 'high';
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate((rot * Math.PI) / 180);
  const dw = swap ? ch : cw;
  const dh = swap ? cw : ch;
  ctx.drawImage(img.source || img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  if (opts.gray || opts.cleanBg) toneCanvas(canvas, opts);
  return canvas;
}

/** Greyscale and/or whiten the background (for scans and signatures). */
export function toneCanvas(canvas, { gray, cleanBg }) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    if (cleanBg) {
      // Light paper -> white, ink stays; stretch contrast in between.
      const v = y > 175 ? 255 : y < 60 ? y * 0.6 : Math.round(((y - 60) / 115) * 255);
      p[i] = p[i + 1] = p[i + 2] = v;
    } else if (gray) {
      p[i] = p[i + 1] = p[i + 2] = y;
    }
  }
  ctx.putImageData(data, 0, 0);
}

export function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.85) {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new UserError('Your browser ran out of memory. Try fewer or smaller images.'))), type, quality));
}
