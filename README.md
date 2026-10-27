# Salcedo Group, Inc. website (v4)

Production: https://www.salcedogroupinc.com

## How it's built
- `design/`: the Claude Design handoff (Version 4). The `*.dc.html` files are the source of truth for copy, layout, URLs and structured data.
- `tools/prerender.mjs`: loads every design page in headless Chrome and writes fully rendered static HTML to `public/` (committed). It swaps in a static header and Index menu, turns the design's hover styles into shared classes, adds image width and height, and maps `*.dc.html` links to the live URLs.
- `static/`: hand-written site chrome (`css/site.css`, `js/site.js`) and `logo.png`.
- `tools/build.mjs`: builds `dist/` from `public/`, `static/` and `design/assets`, then checks every internal link. Vercel runs this, and it needs no dependencies.

## Workflow
```bash
npm install          # puppeteer-core, only needed for prerender
npm run prerender    # after changing anything in design/
npm run dev          # build and serve dist/ on :4173
```

## Environment (Vercel)
- `FORM_ENDPOINT`: the URL the contact form POSTs to (Formspree, Basin, etc.). Without it, the form asks visitors to call.
- `REVIEW_MARKS=off`: removes the "Draft for SGI review" notes once SGI signs off on the copy.

Redirects for the old v2/v3 URLs and the merged pages are in `vercel.json`.
