# FriendsPDF

Free PDF and image tools that run entirely in the browser. Files never leave the device, so there is no server cost and nothing to upload.

Live: https://friendspdf.com (preview: https://thilakar-j.github.io/friendspdf/)

## Tools

JPG/PNG to PDF · PDF to JPG · Merge · Split · Rotate · Page numbers · Watermark · Compress PDF (to an exact KB size) · Resize photo / signature to KB · exam form size guide · "Help me choose" wizard. Works offline after the first visit (PWA).

## Develop

```bash
npm ci
npm run build          # -> dist/ (production, indexable, for friendspdf.com)
npm run serve          # http://localhost:8080
```

`npm run build:cf` is the Cloudflare build (indexable only on `main`). `npm run build:preview` makes the GitHub Pages preview build (served under `/friendspdf/`, `noindex`).

## Test

End-to-end tests push real files through every tool and check the output files, plus SEO, layout at 3 screen sizes, offline mode and "no uploads":

```bash
npm i -g playwright && npx playwright install chromium
npm run build && npm run serve &
NODE_PATH=$(npm root -g) npm test
```

## Going live on friendspdf.com (Cloudflare Pages)

Same setup as dailygoldrateindia.com: **a push to `main` goes live, a push to `dev` updates a private preview.**

- Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → `THILAKAR-J/friendspdf`.
- Production branch `main`, build command `npm run build:cf`, output directory `dist`. Node 20 (`.node-version`).
- Custom domain `friendspdf.com` (and `www`, redirected to the apex).
  - `main` → https://friendspdf.com (indexable, in the sitemap).
  - `dev` (and any other branch) → its own `*.friendspdf.pages.dev` preview address, `noindex` and `Disallow: /` in robots.txt. This is automatic: the build reads `CF_PAGES_BRANCH`.
- Every push builds by itself. If the build fails (broken admin edit, missing file), the deployment fails and the old site stays up.
- `_headers` adds the security headers (CSP) and keeps `/admin/` out of Google.
- The GitHub Pages workflow (`.github/workflows/pages.yml`) still publishes the noindex review copy at thilakar-j.github.io/friendspdf/. The admin does not work there (no Cloudflare Function).

## Admin panel (`/admin/`)

A password-protected page for editing, per page, the **meta title, meta description, meta keywords, heading (H1), extra text above the questions, FAQ** and whether the page is shown in Google. No code needed.

How it works: **Publish** commits `data/content.json` to GitHub (from the live site to `main`, from a preview to that preview's branch). Cloudflare rebuilds and the change is live in about 2 minutes. Every change is in the GitHub history, so any edit can be undone there.

- Page addresses stay locked, so old links and rankings keep working. A page without a field edit keeps its default text from `src/site.mjs` / `src/pages.mjs`.
- Titles (20 to 65 characters), descriptions (70 to 160 recommended, the build only stops above 230), keywords (comma separated, up to 500 characters, optional), unique titles, a non-empty H1 and complete FAQ answers are checked in the admin and **again at build time**: if a bad edit reaches `data/content.json`, the build stops and the live site is unchanged.
- Extra text allows headings, paragraphs, lists, bold, italic and links only (scripts and event handlers are stripped).
- In the heading, `**two stars**` highlight words in blue (the home page uses this).
- Files: `src/admin/` (the page), `functions/admin/api/[[path]].js` (Cloudflare Pages Function: login + save), `src/lib/content.mjs` (applies and validates edits), `data/content.json` (the saved edits, keyed by page address like `/merge-pdf/`).

**One-time setup in Cloudflare** (the Pages project → Settings → Variables and Secrets; add to both Production and Preview, then redeploy):

| Name | Type | Value |
|---|---|---|
| `GITHUB_REPO` | Variable | `THILAKAR-J/friendspdf` |
| `ADMIN_PASSWORD` | Secret | a long, unique password |
| `SESSION_SECRET` | Secret | any long random text (signs the login cookie) |
| `GITHUB_TOKEN` | Secret | fine-grained GitHub token: only this repo, Permissions → Contents: Read and write |

Optional: `CONTENT_BRANCH` (defaults to the branch the deployment was built from). For a second layer of protection put `/admin/*` behind Cloudflare Zero Trust Access.

Local test of the admin (GitHub is replaced by the local file; password `test`): `npm run admin`, then open http://localhost:4190/admin/.

## Structure

- `src/site.mjs` – tools, page text, FAQs and exam sizes (edit content here)
- `src/pages.mjs`, `src/templates.mjs` – HTML for every page
- `src/assets/js/tools/*` – one file per tool engine; `lib/` shared code
- `build.mjs` – static site generator (pages, sitemap, robots, PWA service worker, admin edits)
- `src/admin/`, `functions/admin/`, `data/content.json`, `src/lib/content.mjs` – the admin panel (see above)

Bundled libraries: pdf-lib (MIT), PDF.js (Apache-2.0), fflate (MIT), SortableJS (MIT), Plus Jakarta Sans (OFL). Licences ship in `assets/vendor` and `assets/fonts`.
