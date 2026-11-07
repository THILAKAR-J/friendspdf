// All site content and SEO copy lives here. build.mjs turns it into static pages.

export const SITE = {
  name: 'FriendsPDF',
  url: 'https://friendspdf.com',
  tagline: 'Free PDF tools that work on your phone',
  themeColor: '#1D4ED8',
  lastReviewed: 'November 2026'
};

// Colour pairs for tool categories: [tint background, icon colour]
export const CATS = {
  convert: { label: 'Convert', bg: '#EAF0FF', fg: '#1D4ED8' },
  organize: { label: 'Organize', bg: '#FFF3D6', fg: '#8A5300' },
  optimize: { label: 'Make smaller', bg: '#E7F6EE', fg: '#067647' },
  protect: { label: 'Marks & privacy', bg: '#EFEAFF', fg: '#5B3FD6' }
};

// Main tools shown in grids. `slug` is the URL folder.
export const TOOLS = [
  { slug: 'jpg-to-pdf', name: 'JPG to PDF', tag: 'JPG', cat: 'convert', desc: 'Photos and scans into one PDF', popular: true },
  { slug: 'png-to-pdf', name: 'PNG to PDF', tag: 'PNG', cat: 'convert', desc: 'Screenshots into a PDF' },
  { slug: 'pdf-to-jpg', name: 'PDF to JPG', tag: 'JPG', cat: 'convert', desc: 'Every page as an image' },
  { slug: 'merge-pdf', name: 'Merge PDF', tag: '+', cat: 'organize', desc: 'Many PDFs and photos, one file' },
  { slug: 'split-pdf', name: 'Split PDF', tag: '÷', cat: 'organize', desc: 'Keep only the pages you need' },
  { slug: 'rotate-pdf', name: 'Rotate PDF', tag: '↻', cat: 'organize', desc: 'Fix sideways pages' },
  { slug: 'add-page-numbers', name: 'Add page numbers', tag: '#', cat: 'organize', desc: '1, 2, 3 on every page' },
  { slug: 'compress-pdf-to-kb', name: 'Compress PDF to KB', tag: 'KB', cat: 'optimize', desc: '50, 100, 200 KB or any size', forms: true },
  { slug: 'compress-pdf', name: 'Compress PDF', tag: '↓', cat: 'optimize', desc: 'Smaller file for email and WhatsApp' },
  { slug: 'resize-image-to-kb', name: 'Resize photo to KB', tag: 'KB', cat: 'optimize', desc: 'Exam photo, 20 to 50 KB', forms: true },
  { slug: 'signature-resize', name: 'Signature resize', tag: 'SIG', cat: 'optimize', desc: 'Signature for forms, 10 to 20 KB', forms: true },
  { slug: 'add-watermark', name: 'Add watermark', tag: 'W', cat: 'protect', desc: 'e.g. "Only for bank KYC"' }
];

export const COMING_SOON = [
  { name: 'Word to PDF', tag: 'DOC', cat: 'convert', desc: 'Arrives in the next update' },
  { name: 'PDF to Word', tag: 'DOC', cat: 'convert', desc: 'Arrives in the next update' }
];

// Exam document sizes. Source: published requirements summarised on mysarkarinaukri.com (checked Nov 2026).
export const EXAMS = [
  { id: 'ssc', name: 'SSC', sub: 'CGL, CHSL, MTS, GD', rows: [
    { doc: 'Photo', rule: 'JPG · 20 to 50 KB', kind: 'photo', to: 'resize-image-to-kb', min: 20, max: 50 },
    { doc: 'Signature', rule: 'JPG · 10 to 20 KB', kind: 'sig', to: 'signature-resize', min: 10, max: 20 },
    { doc: 'Caste / EWS / PwD certificate', rule: 'PDF or JPG · under 100 KB', kind: 'pdf', to: 'compress-pdf-to-kb', max: 100 }
  ] },
  { id: 'upsc', name: 'UPSC', sub: 'Civil Services, NDA, CDS', rows: [
    { doc: 'Photo ID proof (Aadhaar / Voter ID)', rule: 'PDF · 20 to 300 KB', kind: 'pdf', to: 'compress-pdf-to-kb', min: 20, max: 300 }
  ] },
  { id: 'ibps', name: 'IBPS / SBI', sub: 'Bank PO, Clerk', rows: [
    { doc: 'Left thumb impression', rule: 'JPG · 20 to 50 KB', kind: 'photo', to: 'resize-image-to-kb', min: 20, max: 50 },
    { doc: 'Hand-written declaration', rule: 'JPG · 50 to 100 KB', kind: 'photo', to: 'resize-image-to-kb', min: 50, max: 100 }
  ] },
  { id: 'rrb', name: 'RRB', sub: 'Railway exams', rows: [
    { doc: 'SC / ST free travel certificate', rule: 'PDF or JPG · 50 to 100 KB', kind: 'pdf', to: 'compress-pdf-to-kb', min: 50, max: 100 }
  ] },
  { id: 'psc', name: 'State PSC', sub: 'UPPSC, BPSC, MPSC', rows: [
    { doc: 'Marksheets', rule: 'PDF or JPG · 100 to 200 KB', kind: 'pdf', to: 'compress-pdf-to-kb', min: 100, max: 200 },
    { doc: 'Domicile certificate', rule: 'PDF or JPG · 100 to 200 KB', kind: 'pdf', to: 'compress-pdf-to-kb', min: 100, max: 200 }
  ] }
];

const PRIVACY_FAQ = { q: 'Are my files uploaded anywhere?', a: 'No. FriendsPDF processes files inside your browser on your own device. Nothing is sent to a server, so it is safe for Aadhaar, PAN, marksheets and bank documents.' };
const FREE_FAQ = { q: 'Is it free?', a: 'Yes. No sign-up, no watermark and no daily limit.' };

// Tool pages. `engine` picks the JavaScript tool; `preset` pre-fills options.
export const TOOL_PAGES = [
  {
    slug: 'jpg-to-pdf', engine: 'img2pdf', cat: 'convert',
    title: 'JPG to PDF Converter – Free, No Upload | FriendsPDF',
    desc: 'Convert JPG photos and scans into one PDF on your phone. Reorder, rotate, pick A4 size. Free, no sign-up, and your images are never uploaded.',
    h1: 'JPG to PDF Converter',
    intro: 'Turn photos, scans and screenshots into one PDF. Free, on your phone, nothing uploaded.',
    preset: { accept: 'image' },
    steps: ['Tap <strong>Select images</strong> or take a photo of your document.', 'Reorder, rotate or remove pages. Pick page size and quality.', 'Tap <strong>Create PDF</strong>. Download it or share it on WhatsApp.'],
    features: [['Reorder and rotate', 'Drag or tap the arrows. Fix sideways photos.'], ['Page size', 'A4, Letter or the same size as the image.'], ['Quality or small file', 'Full detail, or small enough for forms.'], ['ID card on one page', 'Aadhaar front and back together.'], ['Photo location removed', 'GPS and camera details are stripped.'], ['Watermark', 'Add text like "Only for bank KYC".']],
    faq: [{ q: 'Can I put many JPGs into one PDF?', a: 'Yes. Select all your images at once. Each image becomes one page, in the order you set.' }, { q: 'Will the photo quality drop?', a: 'Choose High quality to keep full detail, or Small file when you need a light PDF for forms and WhatsApp.' }, { q: 'Can I make the PDF under 100 KB?', a: 'Yes. After creating it, open Compress PDF to KB and choose 100 KB. You see the final size before you download.' }, PRIVACY_FAQ],
    related: ['png-to-pdf', 'compress-pdf-to-kb', 'merge-pdf', 'pdf-to-jpg']
  },
  {
    slug: 'png-to-pdf', engine: 'img2pdf', cat: 'convert',
    title: 'PNG to PDF – Convert Screenshots to PDF Free | FriendsPDF',
    desc: 'Convert PNG screenshots and images to a clean PDF in seconds. Works on Android, iPhone and desktop. Free, no sign-up, files never leave your device.',
    h1: 'PNG to PDF Converter',
    intro: 'Turn screenshots, receipts and PNG images into a tidy PDF. Transparent areas become white.',
    preset: { accept: 'image' },
    steps: ['Tap <strong>Select images</strong> and pick your PNG screenshots.', 'Put them in order and choose the page size.', 'Tap <strong>Create PDF</strong> and download or share it.'],
    features: [['Screenshots stay sharp', 'High quality keeps text in screenshots crisp.'], ['Many images, one PDF', 'Add as many PNGs as you like.'], ['Fits any page', 'A4, Letter or the exact image size.'], ['White background', 'Transparent PNG areas print cleanly.']],
    faq: [{ q: 'Does it work with WEBP and JPG too?', a: 'Yes. You can mix PNG, JPG and WEBP images in the same PDF.' }, { q: 'Why is my PDF large?', a: 'Screenshots have a lot of detail. Pick Balanced or Small file quality, or use Compress PDF afterwards.' }, PRIVACY_FAQ],
    related: ['jpg-to-pdf', 'compress-pdf', 'merge-pdf']
  },
  {
    slug: 'pdf-to-jpg', engine: 'pdf2jpg', cat: 'convert',
    title: 'PDF to JPG – Convert PDF Pages to Images Free | FriendsPDF',
    desc: 'Convert every page of a PDF into JPG images on your phone. Download one page or all pages as a ZIP. Free, private, nothing is uploaded.',
    h1: 'PDF to JPG Converter',
    intro: 'Save every PDF page as a JPG image. Useful when a portal accepts only images.',
    preset: {},
    steps: ['Tap <strong>Select PDF</strong>.', 'Choose image quality and the pages you need.', 'Download single images or all pages as a ZIP.'],
    features: [['All pages or some', 'Pick only the pages you need.'], ['Two quality levels', 'Normal for sharing, High for printing.'], ['ZIP download', 'All images in one tap.']],
    faq: [{ q: 'Can I convert just one page?', a: 'Yes. Untick the pages you do not need before converting.' }, { q: 'Does it work with password-protected PDFs?', a: 'No. Remove the password first, then convert.' }, PRIVACY_FAQ],
    related: ['jpg-to-pdf', 'split-pdf', 'resize-image-to-kb']
  },
  {
    slug: 'merge-pdf', engine: 'merge', cat: 'organize',
    title: 'Merge PDF – Combine PDF Files and Photos Free | FriendsPDF',
    desc: 'Combine PDFs and photos into one PDF in the order you choose. Perfect for admission and job applications. Free, no sign-up, files stay on your phone.',
    h1: 'Merge PDF',
    intro: 'Join PDFs and photos into one file in the order you choose.',
    preset: {},
    steps: ['Tap <strong>Select files</strong> and pick your PDFs or photos.', 'Drag the handle or use the arrows to set the order.', 'Tap <strong>Merge PDF</strong> and download the single file.'],
    features: [['PDFs and photos together', 'Add a marksheet PDF and a photo in one go.'], ['Easy reordering', 'Drag on desktop, arrows on mobile.'], ['Optional compress', 'Make the merged file smaller in the same step.']],
    faq: [{ q: 'Is there a limit on files?', a: 'No fixed limit. Very large files depend on your phone memory.' }, { q: 'Can I merge password-protected PDFs?', a: 'No. Remove the password first.' }, PRIVACY_FAQ],
    related: ['split-pdf', 'compress-pdf-to-kb', 'add-page-numbers']
  },
  {
    slug: 'split-pdf', engine: 'split', cat: 'organize',
    title: 'Split PDF – Extract Pages from a PDF Free | FriendsPDF',
    desc: 'Pick the pages you need and save them as a new PDF, or split every page into its own file. Free, fast and private. Works on mobile.',
    h1: 'Split PDF',
    intro: 'Keep only the pages you need, or save every page as its own PDF.',
    preset: {},
    steps: ['Tap <strong>Select PDF</strong>.', 'Tap the pages to keep, or type a range like 1-3, 5.', 'Download one PDF, or every page separately as a ZIP.'],
    features: [['Tap to pick pages', 'Page previews make it easy.'], ['Ranges', 'Type 1-3, 7 to select quickly.'], ['Every page separately', 'One PDF per page in a ZIP.']],
    faq: [{ q: 'Does splitting reduce quality?', a: 'No. Pages are copied as they are, so text and images stay the same.' }, PRIVACY_FAQ],
    related: ['merge-pdf', 'compress-pdf-to-kb', 'rotate-pdf']
  },
  {
    slug: 'rotate-pdf', engine: 'rotate', cat: 'organize',
    title: 'Rotate PDF – Fix Sideways Pages Free | FriendsPDF',
    desc: 'Rotate single pages or the whole PDF and save it permanently. See page previews before you download. Free, no sign-up, nothing uploaded.',
    h1: 'Rotate PDF',
    intro: 'Turn sideways or upside-down pages the right way, then save.',
    preset: {},
    steps: ['Tap <strong>Select PDF</strong>.', 'Rotate single pages, or all pages at once.', 'Download the fixed PDF.'],
    features: [['Per page', 'Rotate only the pages that are wrong.'], ['All pages', 'Turn the whole file in one tap.'], ['No quality loss', 'Pages are rotated, not re-drawn.']],
    faq: [{ q: 'Is the rotation saved permanently?', a: 'Yes. The downloaded PDF opens the right way in every viewer.' }, PRIVACY_FAQ],
    related: ['merge-pdf', 'split-pdf', 'add-page-numbers']
  },
  {
    slug: 'add-page-numbers', engine: 'pagenum', cat: 'organize',
    title: 'Add Page Numbers to PDF Free | FriendsPDF',
    desc: 'Add page numbers to any PDF: bottom or top, "1", "Page 1" or "1 of 10" style. Skip the cover page if you want. Free, private, works on mobile.',
    h1: 'Add page numbers to PDF',
    intro: 'Number your pages in a few taps. Good for assignments, reports and applications.',
    preset: {},
    steps: ['Tap <strong>Select PDF</strong>.', 'Choose position, style and the starting number.', 'Tap <strong>Add numbers</strong> and download.'],
    features: [['Position', 'Bottom or top; left, centre or right.'], ['Style', '1, Page 1, or 1 of 10.'], ['Skip the cover', 'Start numbering from page 2.']],
    faq: [{ q: 'Can I start from a number other than 1?', a: 'Yes. Set the starting number, for example 5.' }, PRIVACY_FAQ],
    related: ['merge-pdf', 'add-watermark', 'split-pdf']
  },
  {
    slug: 'add-watermark', engine: 'watermark', cat: 'protect',
    title: 'Add Watermark to PDF – Protect Your ID Copies | FriendsPDF',
    desc: 'Stamp text like "Only for bank KYC" across your PDF so copies cannot be misused. Choose size, colour and position. Free and private.',
    h1: 'Add watermark to PDF',
    intro: 'Stamp a note like "Only for bank KYC, 08 Nov 2026" on every page so your ID copies cannot be misused.',
    preset: {},
    steps: ['Tap <strong>Select PDF</strong>.', 'Type your watermark text and pick the style.', 'Tap <strong>Add watermark</strong> and download.'],
    features: [['Diagonal or straight', 'Across the page or at the bottom.'], ['Light or bold', 'Choose how see-through it is.'], ['Every page', 'Applied to the whole document.']],
    faq: [{ q: 'Why watermark an Aadhaar copy?', a: 'Writing the purpose and date on a copy makes it harder for anyone to reuse it for something else.' }, { q: 'Can the watermark be removed?', a: 'It is drawn onto each page. A determined editor could still remove it, so it is a deterrent, not a lock.' }, PRIVACY_FAQ],
    related: ['jpg-to-pdf', 'add-page-numbers', 'compress-pdf-to-kb']
  },
  {
    slug: 'compress-pdf-to-kb', engine: 'compress', cat: 'optimize',
    title: 'Compress PDF to KB – 50, 100, 200 KB Exact Size | FriendsPDF',
    desc: 'Reduce a PDF to the exact KB size your exam or job form allows: 50, 100, 200 KB or any size. See the final size before you download. Free, no upload.',
    h1: 'Compress PDF to exact KB',
    intro: 'Pick the size your form allows. You see the final KB before you download.',
    preset: { target: 100 },
    steps: ['Tap <strong>Select PDF</strong>.', 'Pick the target size, like 100 KB, or type your own.', 'Check the preview is readable, then download.'],
    features: [['Exact size', 'Always under the limit you pick.'], ['Readable check', 'Preview the pages before downloading.'], ['Black and white option', 'Makes scanned pages much smaller.']],
    faq: [{ q: 'Will the portal accept it?', a: 'We show the exact size before you download. Portals reject files even 1 KB over, so we always stay below your limit.' }, { q: 'Why does text look soft at 50 KB?', a: 'Very small sizes need lower resolution. If your form allows it, pick a bigger size or keep fewer pages.' }, { q: 'Can I still copy text from the compressed PDF?', a: 'When we have to shrink a lot, pages are saved as images, so text cannot be selected. Light compression keeps text when possible.' }, PRIVACY_FAQ],
    related: ['resize-image-to-kb', 'signature-resize', 'merge-pdf']
  },
  {
    slug: 'compress-pdf', engine: 'compress', cat: 'optimize',
    title: 'Compress PDF – Reduce PDF Size Online Free | FriendsPDF',
    desc: 'Make PDFs smaller for email, WhatsApp and upload forms. Choose a size or let us pick a good balance. Free, works on your phone, files never uploaded.',
    h1: 'Compress PDF',
    intro: 'Make your PDF smaller for email, WhatsApp or upload forms.',
    preset: { target: 'auto' },
    steps: ['Tap <strong>Select PDF</strong>.', 'Keep "Recommended" or choose an exact size.', 'Download the smaller PDF.'],
    features: [['Recommended setting', 'A good balance of size and clarity.'], ['Exact KB if you need it', '50, 100, 200 KB and more.'], ['Before and after', 'See how much you saved.']],
    faq: [{ q: 'How much smaller will it get?', a: 'Scanned PDFs often shrink by 70 to 90 percent. Text-only PDFs are usually small already.' }, FREE_FAQ, PRIVACY_FAQ],
    related: ['compress-pdf-to-kb', 'merge-pdf', 'split-pdf']
  },
  {
    slug: 'resize-image-to-kb', engine: 'resize', cat: 'optimize',
    title: 'Resize Image to KB – Photo for Exam Forms | FriendsPDF',
    desc: 'Resize a photo to 20 KB, 50 KB or any size between a minimum and maximum, as SSC, IBPS and other forms ask. Free, instant, photo never uploaded.',
    h1: 'Resize photo to KB',
    intro: 'Make your photo fit the form: set the minimum and maximum KB and we do the rest.',
    preset: { mode: 'photo', min: 20, max: 50 },
    steps: ['Tap <strong>Select photo</strong> or take one.', 'Pick a preset like 20 to 50 KB, or type your own range.', 'Download the JPG and upload it to the form.'],
    features: [['Min and max KB', 'Many forms reject files that are too small too.'], ['Optional size in pixels', 'Set width and height if the form asks.'], ['JPG output', 'The format every portal accepts.']],
    faq: [{ q: 'My form says 20 to 50 KB. What do I pick?', a: 'Choose the 20 to 50 KB preset. We aim near the top of the range for the best quality.' }, { q: 'Can I set pixel size too?', a: 'Yes. Type the width and height in pixels if your notice gives them.' }, PRIVACY_FAQ],
    related: ['signature-resize', 'compress-pdf-to-kb', 'jpg-to-pdf']
  },
  {
    slug: 'signature-resize', engine: 'resize', cat: 'optimize',
    title: 'Signature Resize to 10–20 KB for Online Forms | FriendsPDF',
    desc: 'Resize your signature photo to 10 to 20 KB for SSC, bank and government forms. Clean the background to pure white. Free, private, works on mobile.',
    h1: 'Signature resize',
    intro: 'Sign on white paper, take a photo, and get a clean signature file of the right KB.',
    preset: { mode: 'sig', min: 10, max: 20 },
    steps: ['Sign on plain white paper and take a photo.', 'Keep "Clean background" on and pick the KB range.', 'Download the JPG and upload it.'],
    features: [['Clean background', 'Grey paper becomes pure white.'], ['10 to 20 KB preset', 'Matches common exam rules.'], ['Custom range', 'Type any min and max KB.']],
    faq: [{ q: 'What size does SSC want for signatures?', a: 'Recent SSC notices ask for a JPG of 10 to 20 KB. Always check your official notification.' }, PRIVACY_FAQ],
    related: ['resize-image-to-kb', 'compress-pdf-to-kb', 'jpg-to-pdf']
  }
];

// Keyword landing pages: same engine with a preset size and their own copy.
const KB_PDF = [50, 100, 200, 300, 500];
for (const kb of KB_PDF) {
  TOOL_PAGES.push({
    slug: `compress-pdf-to-${kb}kb`, engine: 'compress', cat: 'optimize', variantOf: 'compress-pdf-to-kb',
    title: `Compress PDF to ${kb} KB – Free, Exact Size | FriendsPDF`,
    desc: `Reduce your PDF to under ${kb} KB for exam, job and government forms. See the final size before you download. Free, no sign-up, files never uploaded.`,
    h1: `Compress PDF to ${kb} KB`,
    intro: `Get your PDF under ${kb} KB in a few seconds, ready for the upload form.`,
    preset: { target: kb },
    steps: ['Tap <strong>Select PDF</strong>.', `${kb} KB is already selected. Change it if your form says otherwise.`, 'Check the preview, then download.'],
    features: [[`Always under ${kb} KB`, 'We never go over your limit.'], ['Readable check', 'Zoom into pages before downloading.'], ['Black and white option', 'Shrinks scanned pages a lot more.']],
    faq: [{ q: `Will my PDF really be under ${kb} KB?`, a: `Yes. The download button shows the final size, which is always below ${kb} KB. If a file cannot get that small, we tell you the smallest size possible.` }, { q: 'What if the text looks blurry?', a: 'Remove pages you do not need with Split PDF, or turn on Black and white. Both make room for sharper text.' }, PRIVACY_FAQ],
    related: ['compress-pdf-to-kb', 'resize-image-to-kb', 'split-pdf']
  });
}
const KB_IMG = [[20, 10, 20], [50, 20, 50], [100, 50, 100]];
for (const [kb, min, max] of KB_IMG) {
  TOOL_PAGES.push({
    slug: `resize-image-to-${kb}kb`, engine: 'resize', cat: 'optimize', variantOf: 'resize-image-to-kb',
    title: `Resize Image to ${kb} KB – Photo for Forms | FriendsPDF`,
    desc: `Resize a photo or signature to under ${kb} KB as a JPG for online application forms. Set a minimum size too. Free, instant and private.`,
    h1: `Resize image to ${kb} KB`,
    intro: `Turn any photo into a JPG between ${min} and ${max} KB, ready to upload.`,
    preset: { mode: 'photo', min, max },
    steps: ['Tap <strong>Select photo</strong>.', `The ${min} to ${max} KB range is set. Adjust it if needed.`, 'Download the JPG.'],
    features: [[`Under ${kb} KB`, 'Fits the upload limit.'], ['Not too small either', `We keep it above ${min} KB.`], ['Optional pixel size', 'Set width and height if needed.']],
    faq: [{ q: `Can I make a photo exactly ${kb} KB?`, a: `We get as close as possible while staying under ${kb} KB, usually within a few KB.` }, PRIVACY_FAQ],
    related: ['resize-image-to-kb', 'signature-resize', 'compress-pdf-to-kb']
  });
}

export const HOME_FAQ = [
  FREE_FAQ,
  { q: 'Are my files stored anywhere?', a: 'No. Everything happens inside your browser. Open a tool, switch on airplane mode, and it still works.' },
  { q: 'Can I get a PDF under 100 KB for my exam form?', a: 'Yes. Use Compress PDF to KB and pick 100 KB. You see the final size before you download.' },
  { q: 'Does it work on my phone?', a: 'Yes, in Chrome or Safari on Android and iPhone. You can also add it to your home screen like an app.' },
  { q: 'Can I convert Word to PDF?', a: 'Coming soon. It needs a small server step, so it arrives in the next update.' }
];

export const POPULAR_SEARCHES = [
  ['jpg to pdf', 'jpg-to-pdf'], ['pdf to jpg', 'pdf-to-jpg'], ['compress pdf to 100kb', 'compress-pdf-to-100kb'],
  ['compress pdf to 200kb', 'compress-pdf-to-200kb'], ['compress pdf to 50kb', 'compress-pdf-to-50kb'],
  ['resize image to 20kb', 'resize-image-to-20kb'], ['resize image to 50kb', 'resize-image-to-50kb'],
  ['signature resize', 'signature-resize'], ['merge pdf', 'merge-pdf'], ['png to pdf', 'png-to-pdf']
];
