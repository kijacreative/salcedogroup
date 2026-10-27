// Assembles dist/ from the pre-rendered pages (public/), the design assets and the static
// chrome. No dependencies; this is what Vercel runs. Regenerate public/ with `npm run prerender`.
//   FORM_ENDPOINT=https://...   where the contact form posts (Formspree, Basin, etc.)
//   REVIEW_MARKS=off            removes the "Draft for SGI review" notes
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const p = (...a) => path.join(ROOT, ...a);
const FORM_ENDPOINT = process.env.FORM_ENDPOINT || '';
const STRIP_REVIEW = /^(off|false|0)$/i.test(process.env.REVIEW_MARKS || '');

// empty dist/ in place so a running preview server keeps serving it
fs.mkdirSync(DIST, { recursive: true });
for (const e of fs.readdirSync(DIST)) fs.rmSync(path.join(DIST, e), { recursive: true, force: true });
fs.cpSync(p('public'), DIST, { recursive: true });
fs.cpSync(p('static'), DIST, { recursive: true });
fs.cpSync(p('design', 'assets'), path.join(DIST, 'assets'), { recursive: true });
for (const f of ['sitemap.xml', 'robots.txt', 'llms.txt']) fs.copyFileSync(p('design', f), path.join(DIST, f));

// one stylesheet: site chrome + the hover styles collected by the prerender
fs.writeFileSync(path.join(DIST, 'css', 'site.css'), fs.readFileSync(p('static', 'css', 'site.css'), 'utf8') + '\n' + fs.readFileSync(p('public', 'css', 'hover.css'), 'utf8'));
fs.rmSync(path.join(DIST, 'css', 'hover.css'));

// design scripts: absolute asset paths (pages are nested), benchmarks on fine pointers only,
// and its button selector matched to the serialized inline styles
fs.copyFileSync(p('design', 'sgi-v3-motion.js'), path.join(DIST, 'js', 'sgi-v3-motion.js'));
fs.writeFileSync(path.join(DIST, 'js', 'sgi-benchmarks.js'), fs.readFileSync(p('design', 'sgi-benchmarks.js'), 'utf8')
  .replace('if (window.__sgiBenchmarks) return;', "if (window.__sgiBenchmarks || !window.matchMedia('(pointer: fine)').matches) return;")
  .replace(/(['(])assets\//g, '$1/assets/')
  .replace('a[style*="min-height:52px"], a[style*="min-height:38px"]', 'a[style*="min-height: 52px"], a[style*="min-height: 38px"], .hd-cta, .ix-cta'));

const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f); else if (e.name === 'index.html') pages.push(f);
  }
})(DIST);

for (const f of pages) {
  let html = fs.readFileSync(f, 'utf8');
  if (STRIP_REVIEW) html = html.replace(/<div role="note"[^>]*data-review-note[^>]*>[\s\S]*?<\/div>/g, '');
  html = html.replace('data-form="" method="post" action=""', `data-form="" method="post" action="${FORM_ENDPOINT.replace(/"/g, '&quot;')}"`);
  fs.writeFileSync(f, html);
}

// 404: the credentials page's chrome around a short message
const base = fs.readFileSync(path.join(DIST, 'credentials', 'index.html'), 'utf8');
const notFound = base
  .replace(/<title>[\s\S]*?<\/title>/, '<title>Page not found | Salcedo Group, Inc.</title>')
  .replace(/<meta name="description"[^>]*>/, '<meta name="robots" content="noindex">')
  .replace(/<link rel="canonical"[^>]*>\n?/, '')
  .replace(/<meta (property|name)="(og|twitter):[^>]*>\n?/g, '')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, '')
  .replace(/ aria-current="page"/g, '')
  .replace(/<main[\s\S]*<\/main>/, `<main style="padding-top:64px"><section style="padding:clamp(80px,14vh,160px) clamp(16px,2.5vw,32px);display:grid;gap:24px;max-width:760px">
<p style="margin:0;display:inline-flex;align-items:center;gap:8px;font-size:13px;line-height:1.35;font-weight:500;color:#5E6368"><img src="/assets/brand/sgi-mark-orange.svg" alt="" aria-hidden="true" style="width:12px;height:12px;display:block"><span style="color:#F43D2C">404</span>( Not found )</p>
<h1 style="margin:0;font-weight:600;font-size:clamp(40px,5.8vw,84px);line-height:0.96;letter-spacing:-0.03em;color:#135222">Off the survey<span style="color:#F43D2C">.</span></h1>
<p style="margin:0;font-size:clamp(19px,1.7vw,24px);line-height:1.3;letter-spacing:-0.01em">That page moved or never existed. Start from the home page, browse our services, or call (214) 412-3122.</p>
<div style="display:flex;flex-wrap:wrap;gap:16px 28px;align-items:center"><a href="/" class="hd-cta" style="min-height:52px;padding:0 26px">Home</a><a href="/services/" style="font-weight:500;text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:3px">Services</a><a href="/work/" style="font-weight:500;text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:3px">Work</a></div>
</section></main>`);
fs.writeFileSync(path.join(DIST, '404.html'), notFound);

// sanity: every internal link and asset resolves
const missing = new Set();
for (const f of [...pages, path.join(DIST, '404.html')]) {
  const html = fs.readFileSync(f, 'utf8');
  for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    const t = path.join(DIST, decodeURIComponent(url));
    if (!(fs.existsSync(t) && (fs.statSync(t).isFile() || fs.existsSync(path.join(t, 'index.html'))))) missing.add(`${path.relative(DIST, f)} -> ${url}`);
  }
}
if (missing.size) { console.error('Broken links:\n' + [...missing].join('\n')); process.exit(1); }
console.log(`Built ${pages.length} pages + 404 into dist/${STRIP_REVIEW ? ' (review notes removed)' : ''}${FORM_ENDPOINT ? '' : ' (FORM_ENDPOINT not set)'}`);
