// Pre-renders the Claude Design handoff (design/*.dc.html) into static HTML in public/.
// The design files build parts of each page in the browser, so this loads every page in
// headless Chrome, takes the finished DOM and writes plain HTML that crawlers can read.
// Run locally after changing anything in design/:  npm run prerender
// Needs Google Chrome (set CHROME_PATH if it isn't in the default macOS location).
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DESIGN = path.join(ROOT, 'design');
const FINAL = path.join(ROOT, 'public');
const OUT = FINAL + '.tmp';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 4199;

// file -> route, from the handoff README page map
export const ROUTES = {
  'home': '/',
  'careers': '/careers/',
  'contact': '/contact/',
  'credentials': '/credentials/',
  'firm': '/firm/',
  'team': '/firm/team/',
  'luis-salcedo': '/firm/team/luis-salcedo/',
  'michael-salcedo': '/firm/team/michael-salcedo/',
  'services': '/services/',
  'civil-engineering': '/services/civil-engineering/',
  'corridor-studies-and-multi-modal-design': '/services/civil-engineering/corridor-studies-and-multi-modal-design/',
  'municipal-design': '/services/civil-engineering/municipal-design/',
  'paving-design': '/services/civil-engineering/paving-design/',
  'site-development': '/services/civil-engineering/site-development/',
  'storm-drainage-design': '/services/civil-engineering/storm-drainage-design/',
  'utility-design': '/services/civil-engineering/utility-design/',
  'construction-administration': '/services/construction-administration/',
  'gis-and-geospatial': '/services/gis-and-geospatial/',
  'hydrology-and-hydraulics': '/services/hydrology-and-hydraulics/',
  'corps-of-engineers-coordination': '/services/hydrology-and-hydraulics/corps-of-engineers-coordination/',
  'culvert-and-bridge-hydraulics': '/services/hydrology-and-hydraulics/culvert-and-bridge-hydraulics/',
  'drainage-studies': '/services/hydrology-and-hydraulics/drainage-studies/',
  'floodplain-studies': '/services/hydrology-and-hydraulics/floodplain-studies/',
  'hydrologic-and-hydraulic-modeling': '/services/hydrology-and-hydraulics/hydrologic-and-hydraulic-modeling/',
  'land-development': '/services/land-development/',
  'land-surveying': '/services/land-surveying/',
  'boundary-and-title-surveys': '/services/land-surveying/boundary-and-title-surveys/',
  'construction-staking': '/services/land-surveying/construction-staking/',
  'plats': '/services/land-surveying/plats/',
  'right-of-way-mapping': '/services/land-surveying/right-of-way-mapping/',
  'topographic-design-surveys': '/services/land-surveying/topographic-design-surveys/',
  'where-we-work': '/where-we-work/',
  'city-of-dallas': '/where-we-work/city-of-dallas/',
  'dallas-county': '/where-we-work/dallas-county/',
  'grand-prairie': '/where-we-work/grand-prairie/',
  'work': '/work/',
  'beckley-at-commerce': '/work/beckley-at-commerce/',
  'camp-wisdom-road': '/work/camp-wisdom-road/',
  'grand-prairie-municipal-campus': '/work/grand-prairie-municipal-campus/',
  'harold-simmons-park': '/work/harold-simmons-park/',
  'pacific-plaza': '/work/pacific-plaza/',
};
// pages the design links to that were merged away
const MERGED = { 'fort-worth': '/services/land-development/', 'balch-springs': '/services/land-development/' };

const NAV = [['01', 'Firm', 'firm'], ['02', 'Services', 'services'], ['03', 'Work', 'work'], ['04', 'Credentials', 'credentials'], ['05', 'Contact', 'contact']];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const STUB = { 'sgi-v3-motion.js': 'window.SGIv3Motion={setup:function(){return function(){}}};', 'sgi-benchmarks.js': '' };

function serve() {
  return http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    // keep motion and the cursor out of the snapshot: they only add runtime inline styles
    if (rel in STUB) { res.writeHead(200, { 'content-type': 'text/javascript' }); res.end(STUB[rel]); return; }
    const file = path.join(DESIGN, rel);
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  }).listen(PORT);
}

const hoverClass = (body) => 'h' + crypto.createHash('sha1').update(body).digest('hex').slice(0, 7);

function rewriteUrls(html) {
  return html
    .replace(/(href|src)="([a-z0-9-]+)\.dc\.html(#[^"]*)?"/gi, (m, attr, name, frag = '') => {
      const route = ROUTES[name] || MERGED[name];
      if (!route) throw new Error(`Unknown page link: ${name}.dc.html`);
      return `${attr}="${route}${frag}"`;
    })
    .replace(/(href|src|content)="(?:\.\/)?assets\//g, '$1="/assets/')
    .replace(/url\((["']?)(?:\.\/)?assets\//g, 'url($1/assets/');
}

function header(current) {
  const link = ([num, label, id]) => `<a href="${ROUTES[id]}"${id === current ? ' aria-current="page"' : ''} class="hd-link"><span>${num}</span>${label}</a>`;
  const item = ([num, label, id]) => `<li><a href="${ROUTES[id]}"${id === current ? ' aria-current="page"' : ''}><span>${num}</span><span>${label}</span></a></li>`;
  return `<header class="hd" data-header>
<a href="/" aria-label="Salcedo Group, Inc. home" class="hd-logo"><img src="/assets/brand/sgi-lockup.svg" alt="SGi, Salcedo Group, Inc." width="152" height="38"></a>
<nav aria-label="Main" class="hd-nav">${NAV.map(link).join('')}</nav>
<div class="hd-actions"><a href="/contact/" class="hd-cta">Request a proposal</a><button type="button" class="hd-index" data-index-open aria-expanded="false" aria-controls="site-index">Index</button></div>
</header>
<div id="site-index" class="ix" role="dialog" aria-modal="true" aria-label="Site index" hidden>
<div class="ix-top"><span>( Index )</span><button type="button" data-index-close aria-label="Close index"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"></path></svg></button></div>
<ol>${item(['00', 'Home', 'home'])}${NAV.map(item).join('')}</ol>
<a href="/contact/" class="ix-cta">Request a proposal</a>
<p class="ix-foot"><img src="/assets/brand/sgi-mark.svg" alt="" aria-hidden="true" width="14" height="14">( Grand Prairie, TX ) · <a href="tel:+12144123122">(214) 412-3122</a></p>
</div>`;
}

// The contact page's "sent" state is behind an sc-if, so it isn't in the snapshot.
const SENT = `<div role="status" data-form-sent hidden style="display:grid;gap:12px;min-height:320px;align-content:center">
<p style="margin:0;font-weight:600;font-size:clamp(30px,3.6vw,52px);line-height:1.04;letter-spacing:-0.025em;color:#135222">Request received.</p>
<p style="margin:0;max-width:30em">We will reply within two business days. For bid deadlines, call (214) 412-3122.</p>
</div>`;

function headFrom(src) {
  const helmet = src.match(/<helmet>([\s\S]*?)<\/helmet>/)[1];
  return helmet
    .replace(/<link rel="stylesheet" href="_ds\/[^"]*">\n?/g, '')
    .replace(/<script src="_ds\/[^"]*"><\/script>\n?/g, '')
    .replace(/<link rel="icon" href="[^"]*">/, '<link rel="icon" href="/assets/brand/sgi-symbol.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="/logo.png">')
    .replace(/<script src="(https:\/\/cdn\.jsdelivr\.net[^"]*)"><\/script>/g, '<script src="$1" defer></script>')
    .replace(/<script src="\.\/(sgi-[a-z0-9-]+\.js)"><\/script>/g, '<script src="/js/$1" defer></script>');
}

async function snapshot(page, name) {
  // the design runtime pulls React from a CDN, so allow for a flaky fetch
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(`http://localhost:${PORT}/${name}.dc.html`, { waitUntil: 'networkidle0', timeout: 45000 });
      await page.waitForFunction(() => document.querySelector('main') && !document.querySelector('.sc-placeholder, .sc-missing'), { timeout: 20000 });
      break;
    } catch (e) {
      if (attempt === 3) throw e;
      console.warn(`  ${name}: retrying (${e.message})`);
    }
  }
  await new Promise((r) => setTimeout(r, 300));
  return page.evaluate(() => {
    // hover/focus styles live in CSSOM rules keyed by generated classes
    const hovers = {};
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const r of rules) {
        const m = r.selectorText && r.selectorText.match(/^\.(scp\d+):(hover|focus|focus-visible|focus-within)$/);
        if (m) (hovers[m[1]] ||= []).push([m[2], r.style.cssText]);
      }
    }
    const top = document.querySelector('main').closest('[style*="font-family"]') || document.querySelector('main').parentElement;
    const root = top.cloneNode(true);
    // live sizes, so the static <img> tags get intrinsic width/height
    const live = [...top.querySelectorAll('img')];
    [...root.querySelectorAll('img')].forEach((im, i) => {
      const l = live[i];
      if (l && l.naturalWidth && !im.hasAttribute('width') && !/\.svg$/.test(im.getAttribute('src'))) { im.setAttribute('width', l.naturalWidth); im.setAttribute('height', l.naturalHeight); }
    });
    // React sets boolean attributes as properties, so they don't serialize; copy them over
    const liveCtl = [...top.querySelectorAll('input, select, textarea, option, details')];
    [...root.querySelectorAll('input, select, textarea, option, details')].forEach((el, i) => {
      for (const b of ['required', 'disabled', 'selected', 'checked', 'open']) if (liveCtl[i] && liveCtl[i][b] === true) el.setAttribute(b, '');
    });
    root.querySelectorAll('header').forEach((h) => { if (h.closest('main') === null) h.replaceWith(document.createComment('SGI-HEADER')); });
    root.querySelectorAll('#site-index, .sgi-bm-pin, script, style').forEach((n) => n.remove());
    root.querySelectorAll('.sc-interp, .sc-host').forEach((n) => n.replaceWith(...n.childNodes));
    root.querySelectorAll('[role="note"]').forEach((n) => { if (/Draft for SGI review/.test(n.textContent)) n.setAttribute('data-review-note', ''); });
    [root, ...root.querySelectorAll('*')].forEach((el) => {
      [...el.attributes].forEach((a) => { if (/^data-(dc|sc)-|^ref$|^hint-/.test(a.name)) el.removeAttribute(a.name); });
      const keep = [...el.classList].filter((c) => !/^sc-/.test(c));
      if (keep.length) el.setAttribute('class', keep.join(' ')); else el.removeAttribute('class');
    });
    root.querySelectorAll('form').forEach((f) => { f.setAttribute('data-form', ''); f.setAttribute('method', 'post'); f.setAttribute('action', ''); });
    root.id = 'top';
    return { html: root.outerHTML, hovers };
  });
}

const fixCss = (s) => s.replace(/;?\s*$/, '').split(/;\s*/).filter(Boolean).map((d) => d.replace(/\s*!important/, '') + ' !important').join(';');

async function main() {
  const server = serve();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('pageerror', (e) => console.warn('  page error:', e.message));
  const hoverCss = new Map();
  fs.rmSync(OUT, { recursive: true, force: true });

  for (const name of Object.keys(ROUTES)) {
    const src = fs.readFileSync(path.join(DESIGN, `${name}.dc.html`), 'utf8');
    const current = (src.match(/<dc-import name="SGI v3 Header" current="([a-z]+)"/) || [])[1] || 'home';
    let { html, hovers } = await snapshot(page, name);
    // swap per-page scpN classes for stable shared ones
    const map = {};
    for (const [cls, rules] of Object.entries(hovers)) {
      const body = rules.map(([state, css]) => `${state}{${fixCss(css)}}`).join('|');
      const stable = hoverClass(body);
      map[cls] = stable;
      if (!hoverCss.has(stable)) hoverCss.set(stable, rules.map(([state, css]) => `.${stable}:${state}{${fixCss(css)}}`).join(''));
    }
    html = html.replace(/class="([^"]*)"/g, (m, c) => `class="${c.split(' ').map((x) => map[x] || x).join(' ')}"`);
    if (/class="[^"]*\bscp\d/.test(html)) console.warn(`  ${name}: unmapped scp class`);
    html = html.replace('<!--SGI-HEADER-->', header(current));
    if (name === 'contact') html = html.replace('</form>', '</form>' + SENT);
    // React reads required="" as false, so restore it from the source markup
    for (const [, tag] of src.matchAll(/<(?:input|select|textarea)\b([^>]*)>/g)) {
      const field = /\brequired\b/.test(tag) && (tag.match(/name="([^"]+)"/) || [])[1];
      if (field) html = html.replace(new RegExp(`(<(?:input|select|textarea)\\b[^>]*name="${field}")`), '$1 required');
    }
    html = rewriteUrls(html);
    const head = rewriteUrls(headFrom(src));

    const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head.trim()}
<meta name="theme-color" content="#135222">
<link rel="stylesheet" href="/css/site.css">
<script src="/js/site.js" defer></script>
</head>
<body>
${html}
</body>
</html>
`;
    const dir = path.join(OUT, ROUTES[name]);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), doc);
    console.log(`${ROUTES[name].padEnd(80)} ${(doc.length / 1024).toFixed(0)} KB`);
  }

  fs.mkdirSync(path.join(OUT, 'css'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'css', 'hover.css'), `/* Generated by tools/prerender.mjs from the design's hover/focus styles. */\n${[...hoverCss.values()].join('\n')}\n`);
  await browser.close();
  server.close();
  fs.rmSync(FINAL, { recursive: true, force: true });
  fs.renameSync(OUT, FINAL);
  console.log(`\n${Object.keys(ROUTES).length} pages, ${hoverCss.size} hover styles`);
}

main().catch((e) => { console.error(e); process.exit(1); });
