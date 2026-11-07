// Resize a photo or signature to a KB range (min..max), output JPG.
import { el, SVG, fmtBytes, fmtKB, isImage, baseName, safeName, UserError } from '../lib/util.js';
import { decodeImage, imageToCanvas, canvasToBlob } from '../lib/images.js';
import { createWorkspace, optRow, nameField, errorText, showDone } from '../lib/ws.js';

const PHOTO_PRESETS = [[20, 50], [10, 20], [50, 100], [0, 100], [0, 200]];
const SIG_PRESETS = [[10, 20], [5, 20], [20, 50], [0, 50]];
const KB = 1000; // stay under the limit whether portals count 1000 or 1024 bytes

/** Search JPEG quality, then scale, to land inside [minB, maxB]. Pure logic over an encode() callback (tested in Node). */
export async function fitToRange(encode, { minB, maxB, baseScale = 1 }) {
  let scale = baseScale;
  let best = null;
  let smallest = null;
  for (let round = 0; round < 12; round++) {
    let lo = 0.3, hi = 0.95, fit = null;
    const top = await encode(scale, hi);
    if (!smallest || top.size < smallest.size) smallest = top;
    if (top.size <= maxB) fit = top; // best quality already fits
    else {
      const bottom = await encode(scale, lo);
      if (!smallest || bottom.size < smallest.size) smallest = bottom;
      if (bottom.size > maxB) { scale *= Math.max(0.5, Math.sqrt(maxB / bottom.size) * 0.95); continue; }
      fit = bottom;
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2;
        const r = await encode(scale, mid);
        if (r.size <= maxB) { fit = r; lo = mid; } else hi = mid;
      }
    }
    best = fit;
    if (best.size >= minB) return { ...best, ok: true };
    // Too small even at top quality: grow the image (capped) and try again.
    if (scale >= baseScale * 2.5) break;
    scale *= Math.min(1.6, Math.sqrt(minB / Math.max(1, best.size)) * 1.08);
  }
  if (best) return { ...best, ok: best.size >= minB && best.size <= maxB, tooSmall: best.size < minB };
  return { ...smallest, ok: false, tooBig: true };
}

export async function start(app, files, preset = {}) {
  const file = files.find(isImage);
  if (!file) throw new UserError('Please choose a photo (JPG, PNG or WEBP).');
  const img = await decodeImage(file);
  const sig = preset.mode === 'sig';
  const presets = sig ? SIG_PRESETS : PHOTO_PRESETS;
  const o = { min: preset.min ?? (sig ? 10 : 20), max: preset.max ?? (sig ? 20 : 50), rot: 0, clean: sig, w: '', h: '' };
  const ws = createWorkspace(app, { cta: 'Resize', onCta: build, ctaClass: 'btn-ok' });

  const prevImg = el('img', { src: img.url, alt: 'Your photo' });
  const thumb = el('div', { class: 'thumb big-thumb' }, [prevImg]);
  ws.main.append(
    el('div', { class: 'file-card' }, [el('span', { class: 'fi img', text: 'IMG', 'aria-hidden': 'true' }), el('div', { class: 'meta' }, [el('strong', { text: file.name }), el('small', { text: `${img.width} × ${img.height} px · ${fmtBytes(file.size)}` })]),
      el('button', { type: 'button', class: 'btn btn-outline', 'aria-label': 'Rotate 90 degrees', on: { click: () => { o.rot = (o.rot + 90) % 360; prevImg.style.transform = `rotate(${o.rot}deg)`; } } }, [el('span', { html: SVG.rotR }), 'Rotate'])]),
    thumb
  );
  const presetBtns = [];
  const isPreset = () => presets.some(([a, b]) => a === o.min && b === o.max);
  const presetsEl = el('div', { class: 'sizes', role: 'group', 'aria-label': 'Size range' }, [
    ...presets.map(([a, b]) => { const btn = el('button', { type: 'button', on: { click: () => { o.min = a; o.max = b; sync(); } } }, [a ? `${a}–${b} KB` : `Under ${b} KB`]); presetBtns.push([a, b, btn]); return btn; }),
    (() => { const btn = el('button', { type: 'button', on: { click: () => { customRow.hidden = false; minIn.focus(); presetBtns.forEach(([, , x]) => x.setAttribute('aria-pressed', 'false')); btn.setAttribute('aria-pressed', 'true'); } } }, ['Custom']); presetBtns.push([null, null, btn]); return btn; })()
  ]);
  const minIn = el('input', { type: 'number', id: 'rs-min', min: '0', max: '5000', inputmode: 'numeric', value: String(o.min), on: { input: () => { o.min = Math.max(0, parseInt(minIn.value, 10) || 0); sync(false); } } });
  const maxIn = el('input', { type: 'number', id: 'rs-max', min: '2', max: '5000', inputmode: 'numeric', value: String(o.max), on: { input: () => { o.max = Math.max(2, parseInt(maxIn.value, 10) || 0); sync(false); } } });
  const customRow = el('div', { class: 'inline-input' }, [el('label', { for: 'rs-min', text: 'Min KB' }), minIn, el('label', { for: 'rs-max', text: 'Max KB' }), maxIn]);
  ws.addSetting(el('div', { class: 'field' }, [el('span', { class: 'field-label', text: 'Size the form asks for' }), presetsEl, customRow]));
  const wIn = el('input', { type: 'number', id: 'rs-w', min: '16', max: '6000', placeholder: 'Auto', inputmode: 'numeric', on: { input: () => { o.w = wIn.value; } } });
  const hIn = el('input', { type: 'number', id: 'rs-h', min: '16', max: '6000', placeholder: 'Auto', inputmode: 'numeric', on: { input: () => { o.h = hIn.value; } } });
  ws.addSetting(el('details', { class: 'faq px' }, [el('summary', { text: 'Exact size in pixels (optional)' }), el('div', { class: 'inline-input' }, [el('label', { for: 'rs-w', text: 'Width' }), wIn, el('label', { for: 'rs-h', text: 'Height' }), hIn]), el('p', { class: 'small muted', text: 'Fill one to keep the shape, or both if your notice gives exact pixels.' })]));
  ws.addSetting(optRow('Clean background', sig ? 'Makes paper pure white so the signature stands out' : 'For scans and signatures on paper', o.clean, (v) => { o.clean = v; }));
  const fname = nameField(baseName(file.name) + (sig ? '-signature' : '-resized'), 'jpg');
  ws.addSetting(fname.node);
  ws.setHint('Pick the size range from your notice');

  function sync(updateInputs = true) {
    const matched = isPreset();
    presetBtns.forEach(([a, b, btn]) => btn.setAttribute('aria-pressed', String(a === null ? !matched : a === o.min && b === o.max)));
    customRow.hidden = matched;
    if (updateInputs) { minIn.value = o.min; maxIn.value = o.max; }
    ws.setCta(o.min ? `Resize to ${o.min}–${o.max} KB` : `Resize to under ${o.max} KB`);
  }
  sync();

  async function build() {
    if (ws.busy) return;
    if (o.max <= o.min) { ws.alert('Max KB must be bigger than Min KB.', 'warn'); return; }
    ws.alert('');
    ws.setBusy(true, 'Resizing…');
    try {
      const W = parseInt(o.w, 10) || 0, H = parseInt(o.h, 10) || 0;
      const swap = o.rot % 180 !== 0;
      const natW = swap ? img.height : img.width, natH = swap ? img.width : img.height;
      let baseScale = Math.min(1, 1600 / Math.max(natW, natH));
      if (W && !H) baseScale = W / natW;
      if (H && !W) baseScale = H / natH;
      const exact = W && H;
      const encode = async (scale, q) => {
        const c = exact ? imageToCanvas(img, { rotate: o.rot, width: W, height: H, cleanBg: o.clean }) : imageToCanvas(img, { rotate: o.rot, scale, cleanBg: o.clean });
        const blob = await canvasToBlob(c, 'image/jpeg', q);
        const r = { blob, size: blob.size, w: c.width, h: c.height, q };
        c.width = c.height = 0;
        return r;
      };
      const r = exact ? await fitExact(encode, o.min * KB, o.max * KB) : await fitToRange(encode, { minB: o.min * KB, maxB: o.max * KB, baseScale });
      const preview = el('img', { src: URL.createObjectURL(r.blob), alt: '' });
      const ba = el('div', { class: 'result-card' + (r.ok ? '' : ' soft') }, [
        el('div', { class: 'ba' }, [el('div', {}, [el('small', { text: 'Before' }), el('span', { class: 'before', text: fmtBytes(file.size) })]), el('span', { html: SVG.arrowR }), el('div', { class: 'right' }, [el('small', { text: 'After' }), el('span', { class: 'after', text: fmtKB(r.size) })])]),
        el('p', { class: 'result-note', text: r.ok ? `${r.w} × ${r.h} px · inside ${o.min ? o.min + '–' : 'under '}${o.max} KB. Ready to upload.` : r.tooSmall ? `This image is very small, so it stays under ${o.min} KB. Use a bigger or sharper photo.` : `Could not get under ${o.max} KB. Try a smaller pixel size.` })
      ]);
      showDone(ws, { blob: r.blob, name: safeName(fname.get(), 'jpg', sig ? 'signature' : 'photo'), kind: 'jpg', preview, extra: ba, title: r.ok ? (sig ? 'Your signature is ready!' : 'Your photo is ready!') : 'Almost there', sub: 'JPG format, accepted by every portal.', next: sig ? ['resize-image-to-kb', 'compress-pdf-to-kb', 'jpg-to-pdf'] : ['signature-resize', 'compress-pdf-to-kb', 'jpg-to-pdf'] });
    } catch (e) {
      ws.alert(errorText(e));
    } finally {
      ws.setBusy(false);
      sync(false);
    }
  }
}

/** Exact pixel size: only quality can change. */
async function fitExact(encode, minB, maxB) {
  let lo = 0.2, hi = 1, fit = null;
  const top = await encode(1, hi);
  if (top.size <= maxB) return { ...top, ok: top.size >= minB, tooSmall: top.size < minB };
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const r = await encode(1, mid);
    if (r.size <= maxB) { fit = r; lo = mid; } else hi = mid;
  }
  if (fit) return { ...fit, ok: fit.size >= minB };
  const low = await encode(1, 0.2);
  return { ...low, ok: false, tooBig: low.size > maxB };
}
