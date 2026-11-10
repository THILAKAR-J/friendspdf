// Content edited in the admin panel (data/content.json) and applied at build time.
//
// data/content.json = { pages: { "/jpg-to-pdf/": { title?, description?, h1?, extra?, faq?: [{q, a}], noindex? } } }
// Keys are page addresses: "/" is the home page, every other page is "/<folder>/".
// A field that is missing keeps the default written in src/site.mjs and src/pages.mjs.
import { esc } from '../templates.mjs';

export const EMPTY = { pages: {} };
export const FIELDS = ['title', 'description', 'h1', 'extra', 'faq', 'noindex'];

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const unesc = (s) => String(s).replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => ENT[m]);
export const cleanText = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** Keep owner-written HTML to simple text tags; drop scripts, styles, event handlers and javascript: links. */
export function cleanHtml(html) {
  let s = String(html || '');
  s = s.replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select)[\s\S]*?(<\/\1>|$)/gi, '');
  s = s.replace(/<\/?(?!\/?(p|h2|h3|ul|ol|li|strong|b|em|i|a|br)\b)[^>]*>/gi, '');
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/href\s*=\s*("|')\s*javascript:[^"']*\1/gi, 'href="#"');
  s = s.replace(/<a\s+(?![^>]*href=)[^>]*>/gi, '<a>');
  return s.trim();
}

const H1_RE = /<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/;
const FAQ_RUN_RE = /(?:<details class="faq">[\s\S]*?<\/details>\s*)+/;

/** The page heading as editable text: highlighted words are written **like this**. */
export function h1Text(body) {
  const m = body.match(H1_RE);
  if (!m) return '';
  return cleanText(unesc(m[2].replace(/<span class="hl">([\s\S]*?)<\/span>/g, '**$1**')));
}
const h1Html = (text) => esc(text).replace(/\*\*([\s\S]+?)\*\*/g, '<span class="hl">$1</span>');

export const faqOf = (jsonld) => {
  const f = (jsonld || []).find((x) => x['@type'] === 'FAQPage');
  return f ? f.mainEntity.map((q) => ({ q: q.name, a: q.acceptedAnswer.text })) : [];
};
const faqHtml = (items) => items.map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n');

/** What the admin shows as the default for a page (read before any override is applied). */
export function defaultsOf(def) {
  const body = def.body || '';
  const faq = faqOf(def.jsonld);
  return {
    title: def.page.title, description: def.page.desc, h1: h1Text(body), faq,
    hasFaq: FAQ_RUN_RE.test(body), h1Editable: H1_RE.test(body) && !/data-g-q/.test(body)
  };
}

/** Apply one page's overrides to its definition (page, body, jsonld, noindex). */
export function applyPage(def, ov = {}) {
  const out = { ...def, page: { ...def.page }, jsonld: (def.jsonld || []).map((x) => ({ ...x })) };
  let body = def.body || '';
  const d = defaultsOf(def);
  if (ov.title && cleanText(ov.title)) out.page.title = cleanText(ov.title);
  if (ov.description && cleanText(ov.description)) out.page.desc = cleanText(ov.description);
  if (ov.noindex) out.noindex = true;
  if (ov.h1 && cleanText(ov.h1) && d.h1Editable) body = body.replace(H1_RE, (m, attrs) => `<h1${attrs || ''}>${h1Html(cleanText(ov.h1))}</h1>`);
  if (Array.isArray(ov.faq) && ov.faq.length && d.hasFaq) {
    const items = ov.faq.filter((f) => f && cleanText(f.q) && cleanText(f.a)).map((f) => ({ q: cleanText(f.q), a: cleanText(f.a) }));
    if (items.length) {
      body = body.replace(FAQ_RUN_RE, () => faqHtml(items) + '\n');
      out.jsonld = out.jsonld.filter((x) => x['@type'] !== 'FAQPage')
        .concat([{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }]);
    }
  }
  if (ov.extra && cleanHtml(ov.extra)) {
    const html = cleanHtml(ov.extra);
    if (body.includes('<div class="two-col">')) {
      body = body.replace('<div class="two-col">', `<section class="prose" aria-label="More about this tool">${html}</section>\n<div class="two-col">`);
    } else {
      const faqSec = /<section class="sec narrow"[^>]*(?:id="faq"|aria-labelledby="(?:faq-h|efaq)")[^>]*>/.exec(body);
      if (faqSec) body = body.slice(0, faqSec.index) + `<section class="sec narrow"><div class="prose">${html}</div></section>\n` + body.slice(faqSec.index);
      else body += `\n<div class="container"><section class="sec narrow"><div class="prose">${html}</div></section></div>`;
    }
  }
  out.body = body;
  return out;
}

/** Same rules the admin shows, checked again at build time so a bad edit can never go live. */
export function validateContent(content, pages) {
  const problems = [];
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const titleOf = (p) => cleanText((content.pages[p.path] || {}).title || p.def.page.title);
  const descOf = (p) => cleanText((content.pages[p.path] || {}).description || p.def.page.desc);
  for (const [path, ov] of Object.entries(content.pages || {})) {
    const p = byPath.get(path);
    if (!p) { problems.push(`${path}: no such page (remove it from data/content.json)`); continue; }
    for (const k of Object.keys(ov)) if (!FIELDS.includes(k)) problems.push(`${path}: unknown field "${k}"`);
    const t = titleOf(p), d = descOf(p), n = (s) => [...s].length;
    if (ov.title !== undefined && (n(t) < 20 || n(t) > 78)) problems.push(`${path}: title is ${n(t)} characters, keep it between 20 and 65`);
    if (ov.description !== undefined && (n(d) < 70 || n(d) > 175)) problems.push(`${path}: description is ${n(d)} characters, keep it between 70 and 160`);
    if ((ov.title !== undefined || ov.description !== undefined) && pages.some((q) => q !== p && ((ov.title !== undefined && titleOf(q) === t) || (ov.description !== undefined && descOf(q) === d)))) problems.push(`${path}: title or description is the same as another page`);
    if (ov.h1 !== undefined && !cleanText(ov.h1)) problems.push(`${path}: the H1 heading is empty`);
    if (ov.faq !== undefined && (!Array.isArray(ov.faq) || ov.faq.some((f) => !f || !cleanText(f.q) || !cleanText(f.a)))) problems.push(`${path}: every FAQ question needs an answer`);
  }
  return problems;
}
