import { SITE, TOOLS, COMING_SOON, CATS, EXAMS, TOOL_PAGES, HOME_FAQ } from './site.mjs';
import { ICON, esc, rich, toolTile, soonTile, faqList, breadcrumbs, toolBySlug } from './templates.mjs';

const abs = (path) => SITE.url + '/' + path;
const faqLd = (faq) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
const crumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })) });

// ---------- dropzone ----------
const DZ = {
  img2pdf: { accept: 'image/*,.heic,.heif', multiple: true, btn: 'Select images', drag: 'Drag and drop your images here', formats: 'JPG · PNG · WEBP · HEIC · No size limit', camera: true },
  resize: { accept: 'image/*,.heic,.heif', multiple: false, btn: 'Select photo', drag: 'Drag and drop your photo here', formats: 'JPG · PNG · WEBP · HEIC', camera: true },
  merge: { accept: 'application/pdf,.pdf,image/*', multiple: true, btn: 'Select files', drag: 'Drag and drop PDFs or photos here', formats: 'PDF · JPG · PNG · WEBP' },
  pdf: { accept: 'application/pdf,.pdf', multiple: false, btn: 'Select PDF', drag: 'Drag and drop your PDF here', formats: 'PDF files · No size limit' }
};
export function dropzone(engine) {
  const d = DZ[engine] || DZ.pdf;
  const cam = d.camera ? `<label class="btn btn-outline btn-lg dz-cam">${ICON.camera}<span>Take a photo</span><input type="file" class="sr-only" accept="image/*" capture="environment" data-pick></label>` : '';
  return `<div class="dropzone" data-drop>
  <span class="dz-icon">${ICON.upload}</span>
  <p class="dz-title">${d.drag}</p>
  <label class="btn btn-primary btn-lg dz-btn">${ICON.upload}<span>${d.btn}</span><input type="file" class="sr-only" accept="${d.accept}"${d.multiple ? ' multiple' : ''} data-pick></label>
  ${cam}
  <p class="dz-hint">${d.formats}</p>
</div>
<p class="private-line">${ICON.shield}<span>Processed on this device · 0 bytes uploaded</span></p>`;
}

// ---------- tool page ----------
export function toolPage(tp) {
  const path = tp.slug + '/';
  const cat = CATS[tp.cat];
  const crumbs = [['Home', ''], ['All tools', 'tools/'], [tp.h1, path]];
  const related = tp.related.map((s) => toolBySlug(s) || TOOL_PAGES.find((x) => x.slug === s)).filter(Boolean)
    .map((t) => `<a class="chip chip-lg" href="../${t.slug}/">${esc(t.name || t.h1)}</a>`).join('');
  const preset = esc(JSON.stringify(tp.preset || {}));
  const engineDz = tp.engine === 'img2pdf' ? 'img2pdf' : tp.engine === 'resize' ? 'resize' : tp.engine === 'merge' ? 'merge' : 'pdf';
  const body = `
<section class="tool-hero">
  <div class="container">
    ${breadcrumbs(crumbs, '../')}
    <div class="tool-layout">
      <div class="tool-head">
        <h1>${esc(tp.h1)}</h1>
        <p class="lead">${esc(tp.intro)}</p>
        <ul class="badges"><li class="badge ok">${ICON.shield}0 bytes uploaded</li><li class="badge">Free</li><li class="badge">No sign-up</li></ul>
      </div>
      <div class="app" id="app" data-engine="${tp.engine}" data-slug="${tp.slug}" data-preset="${preset}">
        ${dropzone(engineDz)}
      </div>
    </div>
  </div>
</section>
<div class="container seo">
  <section aria-labelledby="howto">
    <h2 id="howto">How to use ${esc(tp.h1)}</h2>
    <ol class="steps">${tp.steps.map((s, i) => `<li><span class="step-n">${i + 1}</span><span>${rich(s)}</span></li>`).join('')}</ol>
  </section>
  <section aria-labelledby="features">
    <h2 id="features">What you can do</h2>
    <div class="feature-grid">${tp.features.map(([t, d]) => `<div class="feature cat-${tp.cat}"><strong>${esc(t)}</strong><span>${esc(d)}</span></div>`).join('')}</div>
  </section>
  <div class="two-col">
    <section aria-labelledby="faq" class="col-wide">
      <h2 id="faq">${esc(tp.h1)}: common questions</h2>
      ${faqList(tp.faq)}
    </section>
    <aside class="col-narrow" aria-labelledby="related">
      <h2 id="related">Related tools</h2>
      <div class="chips">${related}<a class="chip chip-lg" href="../exam-forms/">Exam size guide</a></div>
    </aside>
  </div>
</div>`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: tp.h1 + ' – ' + SITE.name, url: abs(path), description: tp.desc, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (runs in the browser)', browserRequirements: 'Requires JavaScript', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url } },
    crumbLd(crumbs),
    faqLd(tp.faq)
  ];
  return { page: { path, title: tp.title, desc: tp.desc }, body, jsonld, active: 'tools', tab: 'tools', scripts: ['assets/js/tool.js'], bodyClass: 'is-tool' };
}

// ---------- home ----------
export function homePage(rel) {
  const top4 = [
    { name: 'JPG to PDF', from: 'JPG', to: 'PDF', href: 'jpg-to-pdf/', note: 'Most searched', hero: true },
    { name: 'PDF to JPG', from: 'PDF', to: 'JPG', href: 'pdf-to-jpg/', note: 'Every page as image' },
    { name: 'Merge PDF', from: 'PDF', to: '1 PDF', href: 'merge-pdf/', note: 'PDFs and photos' },
    { name: 'Resize photo to KB', from: 'IMG', to: 'KB', href: 'resize-image-to-kb/', note: 'For exam forms' }
  ];
  const tiles = TOOLS.map((t) => toolTile(t, rel)).join('') + COMING_SOON.map(soonTile).join('');
  const exams = examPicker(rel, 'home');
  const docs = [['ID cards', 'Aadhaar, PAN, licence', 'jpg-to-pdf/'], ['Certificates', 'Marksheets, TC, degree', 'compress-pdf-to-kb/'], ['Bank & bills', 'Statements, receipts', 'merge-pdf/'], ['Photos', 'Scans, screenshots', 'jpg-to-pdf/']];
  const haves = [['Photos or screenshots', 'Camera or gallery', 'IMG', 'img'], ['A PDF file', 'Downloaded or from WhatsApp', 'PDF', 'pdf'], ['A Word document', 'Resume, letter, assignment', 'DOC', 'doc'], ['Many files to join', 'PDFs and photos together', '+', 'many']];
  const compare = [['Where your file goes', 'Uploaded to their server', 'Stays on your device'], ['Waiting', 'Upload, process, download', 'Instant'], ['Exact KB for forms', 'Guess and retry', 'See the final size first'], ['Sign-up', 'Often needed for big files', 'Never'], ['Price', 'Free with limits', 'Free']];
  const body = `
<section class="hero">
  <div class="container hero-row">
    <div class="hero-copy">
      <span class="pill">${ICON.shield}Free · Private · No sign-up</span>
      <h1>Every PDF tool you need. <span class="hl">Right on your phone.</span></h1>
      <p class="lead">Convert, compress to exact KB, merge and more. Everything runs on your device, so your files never get uploaded.</p>
      <div class="chips popular"><span class="muted">Popular:</span><a class="chip" href="${rel}jpg-to-pdf/">JPG to PDF</a><a class="chip" href="${rel}compress-pdf-to-100kb/">Compress to 100 KB</a><a class="chip" href="${rel}merge-pdf/">Merge PDF</a></div>
      <ul class="checks"><li>${ICON.check}Free forever</li><li>${ICON.check}No watermark</li><li>${ICON.check}No daily limit</li></ul>
    </div>
    <div class="quick card" data-quick>
      <div class="tabs" role="tablist" aria-label="Quick start">
        <button type="button" role="tab" aria-selected="true" data-q="jpg-to-pdf" data-title="Drop your images here" data-btn="Choose images" data-formats="JPG · PNG · WEBP · HEIC · No size limit">Image → PDF</button>
        <button type="button" role="tab" aria-selected="false" data-q="compress-pdf-to-kb" data-title="Shrink a PDF to exact KB" data-btn="Choose PDF" data-formats="Pick 50, 100, 200 KB or any size">Compress to KB</button>
        <button type="button" role="tab" aria-selected="false" data-q="merge-pdf" data-title="Join PDFs and photos" data-btn="Choose files" data-formats="Reorder before you merge">Merge</button>
        <button type="button" role="tab" aria-selected="false" data-q="pdf-to-jpg" data-title="Turn a PDF into images" data-btn="Choose PDF" data-formats="Every page becomes a JPG">PDF → JPG</button>
      </div>
      <div class="quick-drop">
        <span class="dz-icon">${ICON.upload}</span>
        <p class="quick-title" data-q-title>Drop your images here</p>
        <a class="btn btn-primary btn-lg btn-block" href="${rel}jpg-to-pdf/" data-q-btn>Choose images</a>
        <p class="dz-hint" data-q-formats>JPG · PNG · WEBP · HEIC · No size limit</p>
      </div>
      <p class="private-line">${ICON.lock}<span>Processed on this device · 0 bytes uploaded</span></p>
    </div>
  </div>
</section>

<div class="strip"><div class="container strip-row"><span>JPG → PDF</span><i>✦</i><span>PDF → JPG</span><i>✦</i><span>Compress to KB</span><i>✦</i><span>Merge</span><i>✦</i><span>Split</span><i>✦</i><span>Watermark</span></div></div>

<div class="container">
  <section class="install-banner" data-install-banner hidden aria-label="Install">
    <span class="ib-icon">${ICON.download}</span>
    <div><strong>Add FriendsPDF to your home screen</strong><span>Opens like an app. Works offline. No Play Store needed.</span></div>
    <button class="btn btn-light" type="button" data-install>Add</button>
  </section>

  <section class="recent-strip" data-recent-strip hidden aria-labelledby="recent-h">
    <div class="sec-head"><h2 id="recent-h" class="h3">Recent on this device</h2><a href="${rel}recent/">See all</a></div>
    <div class="recent-list" data-recent-list></div>
    <p class="small muted">Saved only on this device. Clear anytime.</p>
  </section>

  <section class="sec" aria-labelledby="most">
    <h2 id="most">Most used</h2>
    <p class="muted sec-sub">The conversions people search for the most.</p>
    <div class="top4">${top4.map((c) => `<a class="top4-card${c.hero ? ' hero' : ''}" href="${rel}${c.href}"><span class="conv"><span>${c.from}</span>${ICON.arrow}<span>${c.to}</span></span><span><strong>${c.name}</strong><small>${c.note}</small></span></a>`).join('')}</div>
    <a class="wide-card" href="${rel}compress-pdf-to-kb/"><span class="wc-icon">KB</span><span><strong>Compress PDF to exact KB</strong><small>50, 100, 200 KB or any size. See the final size before you download.</small></span>${ICON.arrow}</a>
  </section>

  ${exams}

  <section class="sec" aria-labelledby="start">
    <h2 id="start">Not sure which tool? Start here.</h2>
    <p class="muted sec-sub">Tell us what you have. We show what you can do with it.</p>
    <div class="have-grid">${haves.map(([l, h, tag, id]) => `<a class="have" href="${rel}help-me-choose/?have=${id}"><span class="have-tag t-${id}">${tag}</span><span><strong>${l}</strong><small>${h}</small></span></a>`).join('')}</div>
  </section>

  <section class="sec" id="tools" aria-labelledby="all">
    <div class="sec-head"><h2 id="all">All tools</h2><a href="${rel}tools/">See all tools →</a></div>
    <div class="tile-grid">${tiles}</div>
  </section>

  <section class="sec band forest" id="privacy" aria-labelledby="priv">
    <div class="band-copy">
      <h2 id="priv">Your files never leave your device.</h2>
      <p>Most PDF sites upload your file to their server. FriendsPDF does all the work inside your browser. Safe for Aadhaar, PAN, bank statements and certificates.</p>
      <ol class="num-list"><li><b>01</b>The tool loads once. After that your phone does the work, not a server.</li><li><b>02</b>No account, no history, nothing saved on our side.</li><li><b>03</b>Photo location data is removed from your PDF.</li></ol>
    </div>
    <div class="band-side">
      <div class="flow" aria-hidden="true"><div class="flow-phone">${ICON.logo}<span>Your phone</span></div><span class="flow-line"></span><div class="flow-cloud">${ICON.noCloud}<span>No server</span></div></div>
      <div class="test-card">${ICON.plane}<span><strong>Do not just trust us. Test it.</strong>Open a tool, switch on airplane mode. It still works.</span></div>
    </div>
  </section>

  <section class="sec" aria-labelledby="docs">
    <h2 id="docs">What are you working with?</h2>
    <p class="muted sec-sub">Pick your document. We open the right tool.</p>
    <div class="doc-grid">${docs.map(([l, h, href]) => `<a class="doc" href="${rel}${href}"><strong>${l}</strong><small>${h}</small></a>`).join('')}</div>
  </section>

  <section class="sec" aria-labelledby="why">
    <h2 id="why">Why not just any PDF site?</h2>
    <div class="table-wrap"><table class="compare"><thead><tr><th scope="col"><span class="sr-only">Feature</span></th><th scope="col">Typical PDF sites</th><th scope="col" class="us">FriendsPDF</th></tr></thead><tbody>${compare.map(([k, a, b]) => `<tr><th scope="row">${k}</th><td>${a}</td><td class="us">${b}</td></tr>`).join('')}</tbody></table></div>
  </section>

  <section class="sec band ink" id="install" aria-labelledby="phone">
    <div class="band-copy">
      <h2 id="phone">Made for your phone.</h2>
      <p>Snap a photo of a document, pick it from your gallery and get a clean PDF. Big buttons, easy to tap.</p>
      <ul class="checks light"><li>${ICON.check}Works in Chrome and Safari</li><li>${ICON.check}Share straight to WhatsApp</li><li>${ICON.check}Add to home screen, works offline</li></ul>
      <button class="btn btn-light btn-lg" type="button" data-install-help>Add to home screen</button>
    </div>
    <div class="phone-mock" aria-hidden="true"><div class="pm-screen"><strong>JPG to PDF</strong><div class="pm-grid"><i></i><i></i><i></i><i></i></div><span class="pm-btn">Create PDF</span></div></div>
  </section>

  <section class="sec" aria-labelledby="steps3">
    <h2 id="steps3">Three taps. Done.</h2>
    <ol class="big-steps"><li><b>01</b><strong>Pick your files</strong><span>From gallery, camera or drag and drop.</span></li><li><b>02</b><strong>Arrange and set size</strong><span>Reorder, rotate, choose the KB you need.</span></li><li><b>03</b><strong>Download or share</strong><span>Saved to your phone or sent on WhatsApp.</span></li></ol>
  </section>

  <section class="sec narrow" id="faq" aria-labelledby="faq-h">
    <h2 id="faq-h">Questions</h2>
    ${faqList(HOME_FAQ)}
  </section>

  <section class="sec band blue cta">
    <h2>Your next PDF is one tap away.</h2>
    <a class="btn btn-light btn-lg" href="${rel}jpg-to-pdf/">Start with JPG to PDF</a>
  </section>
</div>`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.url + '/', description: SITE.tagline, inLanguage: 'en-IN' },
    { '@context': 'https://schema.org', '@type': 'Organization', name: SITE.name, url: SITE.url + '/', logo: SITE.url + '/assets/img/icon-512.png' },
    faqLd(HOME_FAQ)
  ];
  return {
    page: { path: '', title: 'FriendsPDF – Free PDF Tools: JPG to PDF, Compress to KB', ogTitle: 'FriendsPDF – Free PDF tools that work on your phone', desc: 'Free PDF tools that run on your phone: JPG to PDF, compress PDF to 100 KB, merge, split and resize photos for exam forms. No sign-up, nothing uploaded.' },
    body, jsonld, active: 'home', tab: 'home', scripts: ['assets/js/pages.js']
  };
}

// ---------- exam picker (home + exam page) ----------
export function examPicker(rel, where) {
  const tabs = EXAMS.map((e, i) => `<button type="button" role="tab" id="ex-tab-${where}-${e.id}" aria-controls="ex-${where}-${e.id}" aria-selected="${i === 0}" data-exam-tab="${e.id}">${where === 'page' ? `<strong>${e.name}</strong><small>${e.sub}</small>` : e.name}</button>`).join('');
  const panels = EXAMS.map((e, i) => `<div class="exam-panel" role="tabpanel" id="ex-${where}-${e.id}" aria-labelledby="ex-tab-${where}-${e.id}" data-exam-panel="${e.id}"${i === 0 ? '' : ' data-hidden'}>
    ${where === 'page' ? `<h3 class="exam-h">${e.name} <small>${e.sub}</small></h3>` : ''}
    ${e.rows.map((r) => {
      const q = r.to === 'compress-pdf-to-kb' ? `?target=${r.max}` : `?min=${r.min || ''}&max=${r.max}`;
      return `<div class="exam-row"><span class="exam-tag k-${r.kind}">${r.kind === 'pdf' ? 'PDF' : r.kind === 'sig' ? 'SIG' : 'IMG'}</span><span class="exam-doc"><strong>${esc(r.doc)}</strong><small>${esc(r.rule)}</small></span><a class="btn btn-soft" href="${rel}${r.to}/${q}" aria-label="Fix ${esc(r.doc)} for ${e.name}">Fix</a></div>`;
    }).join('')}
  </div>`).join('');
  const note = `<p class="exam-note">Sizes change between notices. Always check the official notification before you upload. Last reviewed ${SITE.lastReviewed}.</p>`;
  if (where === 'home') {
    return `<section class="sec band navy exam-band" aria-labelledby="forms-h" data-exams>
    <div class="band-copy">
      <span class="kicker">FOR EXAM &amp; JOB FORMS</span>
      <h2 id="forms-h">Make your files fit the form.</h2>
      <p>Pick your exam. We show the sizes it asks for and fix your files in one tap.</p>
      <div class="exam-tabs" role="tablist" aria-label="Exams">${tabs}</div>
      <a class="band-link" href="${rel}exam-forms/">See the full exam size guide →</a>
    </div>
    <div class="exam-card">${panels}${note}</div>
  </section>`;
  }
  return `<div data-exams class="exam-page">
    <h2>1. Pick your exam</h2>
    <div class="exam-cards" role="tablist" aria-label="Exams">${tabs}</div>
    <h2>2. Fix each document</h2>
    <div class="exam-card">${panels}${note}</div>
  </div>`;
}

// ---------- all tools ----------
export function toolsPage(rel) {
  const groups = Object.entries(CATS).map(([id, c]) => {
    const items = TOOLS.filter((t) => t.cat === id).map((t) => toolTile(t, rel, 'tile-row')).join('') + COMING_SOON.filter((t) => t.cat === id).map(soonTile).join('');
    return `<section class="tool-group" data-group="${id}" aria-labelledby="g-${id}"><h2 id="g-${id}">${c.label}</h2><div class="row-grid">${items}</div></section>`;
  }).join('');
  const body = `
<div class="container page-pad">
  ${breadcrumbs([['Home', ''], ['All tools', 'tools/']], rel)}
  <h1>All PDF tools</h1>
  <p class="lead">Every tool is free and runs on your device.</p>
  <form class="searchbar wide" role="search" data-tool-search>
    ${ICON.search}
    <label class="sr-only" for="search">Search tools</label>
    <input id="search" name="q" type="search" placeholder="Search: merge, 100 KB, jpg…" autocomplete="off">
  </form>
  <div class="filter-chips" role="tablist" aria-label="Categories">
    <button type="button" role="tab" aria-selected="true" data-filter="all">All</button>
    ${Object.entries(CATS).map(([id, c]) => `<button type="button" role="tab" aria-selected="false" data-filter="${id}">${c.label}</button>`).join('')}
  </div>
  <p class="no-results" data-no-results hidden>No tool matches that. Try "pdf", "jpg" or "kb".</p>
  ${groups}
  <a class="guide-card" href="${rel}help-me-choose/"><span class="have-tag t-q">?</span><span><strong>Not sure which one?</strong><small>Answer 2 quick questions and we pick the tool for you.</small></span>${ICON.arrow}</a>
</div>`;
  return {
    page: { path: 'tools/', title: 'All Free PDF Tools – Convert, Merge, Compress | FriendsPDF', desc: 'Every FriendsPDF tool in one place: JPG to PDF, PDF to JPG, merge, split, rotate, compress to KB, resize photos and signatures. Free and private.' },
    body, jsonld: [crumbLd([['Home', ''], ['All tools', 'tools/']])], active: 'tools', tab: 'tools', scripts: ['assets/js/pages.js']
  };
}

// ---------- exam forms ----------
export function examPage(rel) {
  const faq = [
    { q: 'What photo size does SSC ask for?', a: 'Recent SSC notices ask for a JPG photo between 20 and 50 KB and a signature between 10 and 20 KB. Check your official notification.' },
    { q: 'Why does the portal reject my file?', a: 'Most portals reject files that are even 1 KB over the limit, or below the minimum. Our tools show the exact size before you download.' },
    { q: 'Are my documents uploaded to FriendsPDF?', a: 'No. Your marksheets and ID proofs are processed on your own device and never sent to a server.' }
  ];
  const body = `
<section class="page-hero navy">
  <div class="container">
    ${breadcrumbs([['Home', ''], ['Exam forms', 'exam-forms/']], rel)}
    <span class="kicker">FOR EXAM &amp; JOB FORMS</span>
    <h1>Exam form size guide: photo, signature and PDF in KB</h1>
    <p class="lead">Pick your exam to see the photo, signature and document sizes it asks for. Fix each one in a tap.</p>
  </div>
</section>
<div class="container page-pad">
  <div class="exam-layout">
    <div class="exam-main">${examPicker(rel, 'page')}</div>
    <aside class="exam-side">
      <form class="custom-kb" action="${rel}compress-pdf-to-kb/" method="get">
        <strong>Exam not listed?</strong>
        <p class="small">Type the size from your notice and we match it.</p>
        <div class="kb-row"><label class="sr-only" for="kb">Size in KB</label><input id="kb" name="target" type="number" min="5" max="5000" value="150" inputmode="numeric"><span>KB</span><button class="btn btn-violet" type="submit">Go</button></div>
      </form>
      <div class="note ok">${ICON.shield}<span><strong>Your documents stay private</strong>Marksheets and ID proofs never leave your phone.</span></div>
    </aside>
  </div>
  <section class="sec" aria-labelledby="ft">
    <h2 id="ft">Tools for forms</h2>
    <div class="tile-grid five">${['compress-pdf-to-kb', 'resize-image-to-kb', 'signature-resize', 'jpg-to-pdf', 'merge-pdf'].map((s) => toolTile(toolBySlug(s), rel)).join('')}</div>
  </section>
  <section class="sec narrow" aria-labelledby="efaq"><h2 id="efaq">Questions</h2>${faqList(faq)}</section>
</div>`;
  return {
    page: { path: 'exam-forms/', title: 'Exam Form Photo, Signature & PDF Size in KB | FriendsPDF', desc: 'Photo, signature and document KB sizes for SSC, UPSC, IBPS, RRB and State PSC forms, with one-tap tools to fix each file. Free and private.' },
    body, jsonld: [crumbLd([['Home', ''], ['Exam forms', 'exam-forms/']]), faqLd(faq)], active: 'forms', tab: 'forms', scripts: ['assets/js/pages.js']
  };
}

// ---------- help me choose ----------
export function guidePage(rel) {
  const body = `
<div class="guide-wrap">
  <div class="container guide" data-guide>
    ${breadcrumbs([['Home', ''], ['Help me choose', 'help-me-choose/']], rel)}
    <div class="guide-top"><button type="button" class="link-btn" data-g-back hidden>← Back</button><span class="g-step" data-g-step>Step 1 of 3 · about 30 seconds</span></div>
    <div class="progress" role="progressbar" aria-label="Progress" aria-valuemin="1" aria-valuemax="3" aria-valuenow="1"><span data-g-bar></span></div>
    <div class="g-chips" data-g-chips hidden></div>
    <h1 data-g-q>What do you have?</h1>
    <p class="muted" data-g-sub>Tap one. We show what you can do with it.</p>
    <div class="g-options" data-g-options role="radiogroup" aria-label="Options"></div>
    <div class="g-kb" data-g-kb hidden><strong>How small?</strong><div class="seg3" data-g-kbs></div></div>
    <div class="g-final" data-g-final hidden></div>
    <noscript><p>Pick a tool directly: <a href="${rel}tools/">All tools</a></p></noscript>
  </div>
  <div class="g-next-bar" data-g-nextbar><div class="container"><button type="button" class="btn btn-dark btn-lg btn-block" data-g-next>Next →</button></div></div>
</div>`;
  return {
    page: { path: 'help-me-choose/', title: 'Help Me Choose a PDF Tool | FriendsPDF', desc: 'Not sure which PDF tool you need? Answer two quick questions about your file and we open the right FriendsPDF tool with the right settings.' },
    body, jsonld: [crumbLd([['Home', ''], ['Help me choose', 'help-me-choose/']])], active: 'guide', tab: '', scripts: ['assets/js/pages.js'], bodyClass: 'cream'
  };
}

// ---------- recent ----------
export function recentPage(rel) {
  const body = `
<div class="container page-pad narrow">
  ${breadcrumbs([['Home', ''], ['Recent files', 'recent/']], rel)}
  <div class="sec-head"><h1>Recent files</h1><button type="button" class="link-btn danger" data-recent-clear hidden>Clear all</button></div>
  <p class="lead">Files you made in the last 7 days. They are kept only in this browser, on this device.</p>
  <div class="recent-list big" data-recent-list></div>
  <p class="empty" data-recent-empty hidden>No recent files yet. <a href="${rel}tools/">Pick a tool</a> to make one.</p>
  <label class="toggle-row card"><span><strong>Keep recent files on this device</strong><small>Turn off on a shared phone. Files are deleted after 7 days.</small></span><input type="checkbox" data-recent-toggle checked></label>
</div>`;
  return {
    page: { path: 'recent/', title: 'Recent Files | FriendsPDF', desc: 'PDFs and images you made with FriendsPDF in the last 7 days, stored only in this browser on your device.' },
    body, jsonld: [], active: '', tab: 'recent', scripts: ['assets/js/pages.js'], noindex: true
  };
}

// ---------- privacy / terms / 404 ----------
export function privacyPage(rel) {
  const body = `
<article class="container page-pad prose">
  ${breadcrumbs([['Home', ''], ['Privacy', 'privacy/']], rel)}
  <h1>Privacy policy</h1>
  <p class="lead">Short version: your files never leave your device. We cannot see them, store them or share them.</p>
  <h2>Your files</h2>
  <p>Every FriendsPDF tool runs inside your web browser. When you pick a photo or PDF, it is read and processed by your own phone or computer. It is not uploaded to any server. You can check this yourself: open a tool, turn on airplane mode, and it keeps working.</p>
  <h2>Recent files</h2>
  <p>To let you download a file again, the files you create are saved in your browser's storage on your device for up to 7 days. We never receive them. You can turn this off or delete them on the <a href="${rel}recent/">Recent files</a> page. Clearing your browser data also deletes them.</p>
  <h2>Accounts and cookies</h2>
  <p>There are no accounts and no sign-up. We do not use advertising or tracking cookies. Your browser may store small settings, like whether recent files are on.</p>
  <h2>Website hosting</h2>
  <p>Like any website, our hosting provider may log basic technical data such as IP address and the pages requested, to keep the site running and secure. These logs never contain your files.</p>
  <h2>Changes</h2>
  <p>If this policy changes, we will update this page and the date below.</p>
  <p class="muted">Last updated: 8 November 2026</p>
</article>`;
  return { page: { path: 'privacy/', title: 'Privacy Policy – Your Files Stay on Your Device | FriendsPDF', desc: 'FriendsPDF processes files inside your browser. Nothing is uploaded, there are no accounts and no tracking cookies. Read the full privacy policy.' }, body, jsonld: [], active: 'privacy', tab: '' };
}

export function termsPage(rel) {
  const body = `
<article class="container page-pad prose">
  ${breadcrumbs([['Home', ''], ['Terms', 'terms/']], rel)}
  <h1>Terms of use</h1>
  <p class="lead">FriendsPDF is free to use for personal, educational and work tasks.</p>
  <h2>Using the tools</h2>
  <p>You are responsible for the files you process and for having the right to use them. Do not use FriendsPDF to break the law or anyone's rights.</p>
  <h2>No guarantee</h2>
  <p>We work hard to make the tools accurate, but they are provided as they are. Always check your file before you submit it, especially for exams and official forms. Size rules in our exam guide are a summary; the official notification always wins.</p>
  <h2>Changes</h2>
  <p>We may improve, change or remove tools at any time.</p>
  <p class="muted">Last updated: 8 November 2026</p>
</article>`;
  return { page: { path: 'terms/', title: 'Terms of Use | FriendsPDF', desc: 'The simple terms for using FriendsPDF: free PDF and image tools that run in your browser, with no sign-up and no file uploads.' }, body, jsonld: [], active: '', tab: '' };
}

export function notFoundPage(rel) {
  const body = `
<div class="container page-pad narrow center">
  <h1>Page not found</h1>
  <p class="lead">That page does not exist, but these tools do.</p>
  <div class="chips center">${['jpg-to-pdf', 'compress-pdf-to-kb', 'merge-pdf', 'resize-image-to-kb'].map((s) => `<a class="chip chip-lg" href="${rel}${s}/">${toolBySlug(s).name}</a>`).join('')}</div>
  <p><a class="btn btn-primary btn-lg" href="${rel}">Go to home</a></p>
</div>`;
  return { page: { path: '404.html', title: 'Page Not Found | FriendsPDF', desc: 'This page does not exist. Try one of our free PDF tools.' }, body, jsonld: [], active: '', tab: '', noindex: true };
}
