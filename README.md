# Salcedo Group, Inc. website (v2)

Static site generated from `site/data.mjs` by `site/build.mjs` (Node 18+, no dependencies).

```bash
npm run build          # writes ./dist
SITE_URL=https://example.com FORM_ENDPOINT=https://formspree.io/f/xxxx npm run build
```

- `site/data.mjs`: all content (people, projects, services, places, FAQ). Every claim comes from the 2025 SGI Firm Profile.
- `src/`: CSS, JS, images (WebP), favicon and logo, copied into `dist/` as-is.
- `vercel.json`: builds on Vercel with clean, trailing-slash URLs.

## SEO / AEO
- Unique title, description, canonical, Open Graph and Twitter tags per page.
- JSON-LD `@graph` on every page: Organization + ProfessionalService, WebSite, WebPage (with speakable), BreadcrumbList,
  plus Person (team bios), Service (each service), CreativeWork (projects), FAQPage, ItemList and City/AdministrativeArea.
- Answer-first "In brief" summaries and question-style headings for answer engines.
- `sitemap.xml` (with image entries), `robots.txt` (explicitly allows AI crawlers), `llms.txt` and `llms-full.txt`.

## Motion
GSAP 3.12.5 + ScrollTrigger (cdnjs), following the Open Design `gsap-scrolltrigger` and `emilkowalski-motion` skills:
word-mask headline reveals, contour lines that draw themselves, count-up stats, a pinned horizontal "how we work" sequence,
batched scroll reveals and image parallax. Everything respects `prefers-reduced-motion`, and content stays visible if
scripts fail to load.

## Before launch
- Production domain is `https://www.salcedogroupinc.com` (override with `SITE_URL` for staging builds).
- Set `FORM_ENDPOINT` so the proposal form can deliver requests; until then it asks visitors to call.
- Several source images are under 1,200px wide; higher-resolution originals will sharpen the hero and galleries.
