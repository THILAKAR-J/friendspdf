// Page geometry in PDF points (1/72 inch). Pure functions: also used by the Node tests.
export const PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792] };
export const MARGINS = { none: 0, small: 18, large: 36 };
export const FIT_MAX = 1190; // longest side (pt) when page size = same as image

/** Where to draw an image of imgW x imgH px on its page. Origin bottom-left. */
export function layoutPage(imgW, imgH, o) {
  const m = MARGINS[o.margin] ?? 0;
  if (o.pageSize === 'fit') {
    let k = 0.75; // 96 dpi px -> pt
    const longest = Math.max(imgW, imgH) * k;
    if (longest > FIT_MAX) k = (k * FIT_MAX) / longest;
    const fw = imgW * k, fh = imgH * k;
    return { pageW: fw + 2 * m, pageH: fh + 2 * m, x: m, y: m, w: fw, h: fh };
  }
  let [pw, ph] = PAGE_SIZES[o.pageSize] || PAGE_SIZES.a4;
  const landscape = o.orientation === 'landscape' || (o.orientation !== 'portrait' && imgW > imgH);
  if (landscape) [pw, ph] = [ph, pw];
  const s = Math.min((pw - 2 * m) / imgW, (ph - 2 * m) / imgH);
  const w = imgW * s, h = imgH * s;
  return { pageW: pw, pageH: ph, x: (pw - w) / 2, y: (ph - h) / 2, w, h };
}

/** Two images stacked on one portrait page (ID card front + back). Returns boxes for each. */
export function layoutPair(a, b, o) {
  let [pw, ph] = PAGE_SIZES[o.pageSize === 'letter' ? 'letter' : 'a4'];
  const m = Math.max(MARGINS[o.margin] ?? 18, 18);
  const gap = 24;
  const slotW = pw - 2 * m;
  const slotH = (ph - 2 * m - gap) / 2;
  const fit = (img, top) => {
    const s = Math.min(slotW / img.w, slotH / img.h, 1.5);
    const w = img.w * s, h = img.h * s;
    const x = (pw - w) / 2;
    const slotBottom = top ? ph - m - slotH : m;
    return { x, y: slotBottom + (slotH - h) / 2, w, h };
  };
  return { pageW: pw, pageH: ph, boxes: [fit(a, true), b ? fit(b, false) : null] };
}

/**
 * Map a point in visual page space (what the reader sees, origin bottom-left) to PDF user space,
 * for a page whose /Rotate is `angle`. W,H = unrotated page size. Also returns the text rotation needed.
 */
export function visualToUser(vx, vy, angle, W, H) {
  switch (((angle % 360) + 360) % 360) {
    case 90: return { x: W - vy, y: vx, rot: 90 };
    case 180: return { x: W - vx, y: H - vy, rot: 180 };
    case 270: return { x: vy, y: H - vx, rot: 270 };
    default: return { x: vx, y: vy, rot: 0 };
  }
}
export function visualSize(angle, W, H) {
  const a = ((angle % 360) + 360) % 360;
  return a === 90 || a === 270 ? [H, W] : [W, H];
}
