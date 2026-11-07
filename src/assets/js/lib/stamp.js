// Draw text on a PDF page in "what the reader sees" coordinates, whatever the page's /Rotate is.
import { PDFLib } from './pdf.js';
import { visualToUser, visualSize } from './layout.js';

export const COLORS = { grey: [0.45, 0.47, 0.52], red: [0.75, 0.12, 0.16], blue: [0.11, 0.3, 0.85], black: [0.08, 0.1, 0.18] };

/**
 * pos: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left' | 'center' | 'diagonal'
 */
export function drawVisualText(page, text, { font, size, color = COLORS.black, opacity = 1, pos = 'bottom-center', margin = 28 }) {
  const box = page.getCropBox();
  const angle = page.getRotation().angle || 0;
  const [VW, VH] = visualSize(angle, box.width, box.height);
  const tw = font.widthOfTextAtSize(text, size);
  let vx, vy, a = 0;
  if (pos === 'diagonal' || pos === 'center') {
    a = pos === 'diagonal' ? Math.atan2(VH, VW) : 0;
    const cx = VW / 2, cy = VH / 2;
    vx = cx - (Math.cos(a) * tw) / 2 + Math.sin(a) * size * 0.3;
    vy = cy - (Math.sin(a) * tw) / 2 - Math.cos(a) * size * 0.3;
  } else {
    const [v, h] = pos.split('-');
    vy = v === 'top' ? VH - margin - size * 0.75 : margin;
    vx = h === 'left' ? margin : h === 'right' ? VW - margin - tw : (VW - tw) / 2;
  }
  const u = visualToUser(vx, vy, angle, box.width, box.height);
  page.drawText(text, {
    x: u.x + box.x, y: u.y + box.y, size, font,
    color: PDFLib.rgb(...color), opacity,
    rotate: PDFLib.degrees((u.rot + (a * 180) / Math.PI) % 360)
  });
}

/** Font size that keeps a diagonal/centred watermark inside the page. */
export function fitSize(page, font, text, pos, scale) {
  const box = page.getCropBox();
  const [VW, VH] = visualSize(page.getRotation().angle || 0, box.width, box.height);
  const span = pos === 'diagonal' ? Math.hypot(VW, VH) * 0.8 : VW * 0.85;
  const w1 = font.widthOfTextAtSize(text, 1) || 1;
  const s = Math.min(span / w1, VH * 0.2);
  return Math.max(8, s * scale);
}
