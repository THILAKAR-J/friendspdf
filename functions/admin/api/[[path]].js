// Admin API (Cloudflare Pages Function). Saves admin edits to data/content.json in GitHub; Cloudflare then
// rebuilds that branch by itself, so a save goes live in about two minutes.
//
// Environment variables (Cloudflare → the Pages project → Settings → Variables and secrets):
//   ADMIN_PASSWORD   the admin login password
//   SESSION_SECRET   any long random text (signs the login cookie)
//   GITHUB_TOKEN     fine-grained token for this repository: Contents read/write
//   GITHUB_REPO      THILAKAR-J/friendspdf
//   CONTENT_BRANCH   optional; defaults to the branch this deployment was built from (main = live site, dev = preview)

const FILE = 'data/content.json';
const COOKIE = 'fp_admin';
const DAY = 86400;

export async function onRequest(context) {
  const { request, env, params } = context;
  const route = [].concat(params.path || []).join('/');
  const method = request.method;
  try {
    if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET || !env.GITHUB_TOKEN || !env.GITHUB_REPO) return json({ error: 'The admin is not set up yet: add ADMIN_PASSWORD, SESSION_SECRET, GITHUB_TOKEN and GITHUB_REPO in Cloudflare.' }, 503);
    if (method !== 'GET' && !sameOrigin(request)) return json({ error: 'Blocked: request from another site.' }, 403);

    if (route === 'login' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      await new Promise((r) => setTimeout(r, 400)); // slows down password guessing
      if (!(await safeEqual(env, String(body.password || ''), env.ADMIN_PASSWORD))) return json({ error: 'Wrong password.' }, 401);
      const exp = Math.floor(Date.now() / 1000) + 7 * DAY;
      const token = `${exp}.${await sign(env, String(exp))}`;
      return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=${token}; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * DAY}` });
    }
    if (route === 'logout' && method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });

    if (!(await loggedIn(env, request))) return json({ error: 'Please log in.' }, 401);
    const branch = env.CONTENT_BRANCH || env.CF_PAGES_BRANCH || 'main';

    if (route === 'me' && method === 'GET') return json({ ok: true, branch, repo: env.GITHUB_REPO });

    if (route === 'content' && method === 'GET') {
      const f = await gh(env, `contents/${FILE}?ref=${encodeURIComponent(branch)}`);
      if (f.status === 404) return json({ content: { pages: {} }, sha: null, branch });
      if (!f.ok) return json({ error: `GitHub said ${f.status}` }, 502);
      const d = await f.json();
      return json({ content: JSON.parse(fromB64(d.content)), sha: d.sha, branch });
    }

    if (route === 'content' && method === 'PUT') {
      const body = await request.json().catch(() => null);
      const problem = checkContent(body && body.content);
      if (problem) return json({ error: problem }, 400);
      const text = JSON.stringify(body.content, null, 2) + '\n';
      const put = await gh(env, `contents/${FILE}`, {
        method: 'PUT',
        body: JSON.stringify({ message: String(body.message || 'Admin: update content').slice(0, 120), content: toB64(text), sha: body.sha || undefined, branch })
      });
      if (put.status === 409 || put.status === 422) return json({ error: 'Someone saved in the meantime. Reload the admin and try again.' }, 409);
      if (!put.ok) return json({ error: `GitHub said ${put.status}` }, 502);
      const d = await put.json();
      return json({ ok: true, sha: d.content.sha, commit: d.commit.sha.slice(0, 7) });
    }

    if (route === 'activity' && method === 'GET') {
      const r = await gh(env, `commits?sha=${encodeURIComponent(branch)}&per_page=12`);
      if (!r.ok) return json({ error: `GitHub said ${r.status}` }, 502);
      const list = await r.json();
      return json({ items: list.map((c) => ({ sha: c.sha.slice(0, 7), message: c.commit.message.split('\n')[0], by: c.commit.author.name, at: c.commit.author.date })) });
    }

    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: 'Admin error: ' + (e && e.message ? e.message : 'unknown') }, 500);
  }
}

/* ---------- validation: the build checks SEO again before anything goes live ---------- */
function checkContent(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'Content must be an object.';
  if (JSON.stringify(c).length > 400000) return 'Content is too large.';
  const pages = c.pages || {};
  if (typeof pages !== 'object' || Array.isArray(pages)) return 'pages must be an object.';
  for (const [path, p] of Object.entries(pages)) {
    if (!/^\/[a-z0-9\-\/]*$/.test(path) || (path !== '/' && !path.endsWith('/'))) return `Bad page address: ${path}`;
    if (!p || typeof p !== 'object' || Array.isArray(p)) return `${path}: edits must be an object`;
    for (const k of Object.keys(p)) if (!['title', 'description', 'h1', 'extra', 'faq', 'noindex'].includes(k)) return `${path}: unknown field ${k}`;
    for (const k of ['title', 'description', 'h1']) if (p[k] !== undefined && (typeof p[k] !== 'string' || p[k].length > 300)) return `${path}: ${k} must be text under 300 characters`;
    if (p.extra !== undefined && (typeof p.extra !== 'string' || p.extra.length > 20000)) return `${path}: extra text is too long`;
    if (p.faq !== undefined && (!Array.isArray(p.faq) || p.faq.length > 20 || p.faq.some((f) => !f || typeof f.q !== 'string' || typeof f.a !== 'string' || f.q.length > 300 || f.a.length > 3000))) return `${path}: FAQ must be up to 20 questions with answers`;
    if (p.noindex !== undefined && typeof p.noindex !== 'boolean') return `${path}: noindex must be true or false`;
  }
  return null;
}

/* ---------- helpers ---------- */
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...headers } });
}
function sameOrigin(req) {
  const o = req.headers.get('Origin');
  return !o || o === new URL(req.url).origin;
}
function gh(env, path, init = {}) {
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'friendspdf-admin', 'Content-Type': 'application/json' }
  });
}
const enc = new TextEncoder();
async function hmac(env, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}
async function sign(env, text) {
  return btoa(String.fromCharCode(...(await hmac(env, text)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function safeEqual(env, a, b) {
  const [x, y] = await Promise.all([hmac(env, 'pw:' + a), hmac(env, 'pw:' + b)]);
  let d = 0; for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
async function loggedIn(env, req) {
  const m = (req.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9]+)\\.([A-Za-z0-9_-]+)`));
  if (!m || Number(m[1]) < Date.now() / 1000) return false;
  const good = await sign(env, m[1]);
  if (good.length !== m[2].length) return false;
  let d = 0; for (let i = 0; i < good.length; i++) d |= good.charCodeAt(i) ^ m[2].charCodeAt(i);
  return d === 0;
}
function toB64(text) {
  const bytes = enc.encode(text); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
