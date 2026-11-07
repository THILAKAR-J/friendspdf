import fs from 'node:fs';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
const dir = new URL('./fixtures/', import.meta.url).pathname;
async function textPdf(name, pages, label, rotateSecond = false) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const p = doc.addPage([595.28, 841.89]);
    p.drawText(`${label} page ${i}`, { x: 60, y: 760, size: 28, font, color: rgb(0.1, 0.1, 0.2) });
    for (let l = 0; l < 30; l++) p.drawText(`Line ${l + 1} of sample text for ${label}.`, { x: 60, y: 700 - l * 20, size: 12, font });
    if (rotateSecond && i === 2) p.setRotation(degrees(90));
  }
  fs.writeFileSync(dir + name, await doc.save());
}
await textPdf('text3.pdf', 3, 'Alpha');
await textPdf('text2.pdf', 2, 'Beta');
await textPdf('rotated.pdf', 3, 'Gamma', true);
// Heavy scanned PDF from 3 page images
const scan = await PDFDocument.create();
for (let i = 0; i < 3; i++) {
  const img = await scan.embedJpg(fs.readFileSync(dir + `scan_${i}.jpg`));
  const p = scan.addPage([595.28, 841.89]);
  p.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
}
fs.writeFileSync(dir + 'scanned3.pdf', await scan.save());
const one = await PDFDocument.create();
const img = await one.embedJpg(fs.readFileSync(dir + 'scan_0.jpg'));
one.addPage([595.28, 841.89]).drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
fs.writeFileSync(dir + 'scanned1.pdf', await one.save());
// many pages (for lazy thumbnails / performance)
const many = await PDFDocument.create();
const f = await many.embedFont(StandardFonts.Helvetica);
for (let i = 1; i <= 40; i++) many.addPage([595.28, 841.89]).drawText(`Long doc page ${i}`, { x: 60, y: 760, size: 24, font: f });
fs.writeFileSync(dir + 'many40.pdf', await many.save());
console.log('pdfs ok');
