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

`npm run build:preview` makes the GitHub Pages preview build (served under `/friendspdf/`, `noindex`).

## Test

End-to-end tests push real files through every tool and check the output files, plus SEO, layout at 3 screen sizes, offline mode and "no uploads":

```bash
npm i -g playwright && npx playwright install chromium
npm run build && npm run serve &
NODE_PATH=$(npm root -g) npm test
```

## Going live on friendspdf.com

Host `dist/` from `npm run build` (not the preview build) on Cloudflare Pages or Netlify: build command `npm run build`, output folder `dist`. The `_headers` file adds the security headers (CSP) there.

## Structure

- `src/site.mjs` – tools, page text, FAQs and exam sizes (edit content here)
- `src/pages.mjs`, `src/templates.mjs` – HTML for every page
- `src/assets/js/tools/*` – one file per tool engine; `lib/` shared code
- `build.mjs` – static site generator (pages, sitemap, robots, PWA service worker)

Bundled libraries: pdf-lib (MIT), PDF.js (Apache-2.0), fflate (MIT), SortableJS (MIT), Plus Jakarta Sans (OFL). Licences ship in `assets/vendor` and `assets/fonts`.
