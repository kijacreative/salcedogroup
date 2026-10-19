// Static site generator for salcedogroup v2. No dependencies: `node site/build.mjs` writes ./dist.
import { mkdirSync, writeFileSync, cpSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, IMG, PEOPLE, STAFF, PROJECTS, DEV, DISCIPLINES, SERVICES, PLACES, FAQ, CLIENTS } from './data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');
const TODAY = new Date().toISOString().slice(0, 10);
const U = (p) => SITE.url + p;
const ORG = U('/#org');
const WEBSITE = U('/#website');

// ---------- helpers ----------
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const byProject = (slug) => PROJECTS.find((p) => p.slug === slug);
const byService = (slug) => SERVICES.find((s) => s.slug === slug);
const byPerson = (slug) => PEOPLE.find((p) => p.slug === slug);
const discOf = (s) => DISCIPLINES.find((d) => d.slug === s.discipline);
const projUrl = (p) => `/projects/${p.slug}/`;
const svcUrl = (s) => `/services/${s.discipline}/${s.slug}/`;
const personUrl = (p) => `/firm/${p.slug}/`;
const placeUrl = (p) => `/where-we-work/${p.slug}/`;
const fullName = (p) => `${p.name}, ${p.creds}`;
const imgUrl = (name) => `/img/${name}.webp`;

function pic(name, alt, { cls = '', eager = false, sizes = '100vw', attrs = '' } = {}) {
  const [w, h] = IMG[name] || [1200, 800];
  return `<img src="${imgUrl(name)}" width="${w}" height="${h}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''} sizes="${sizes}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"${attrs ? ' ' + attrs : ''}>`;
}

const arrow = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function logo(variant = '') {
  return `<img class="lockup" src="/brand/sgi-lockup${variant}.svg" width="282" height="100" alt="SGi, Salcedo Group, Inc.">`;
}
const markImg = (c = 'orange', cls = 'bm') => `<img class="${cls}" src="/brand/sgi-mark${c ? '-' + c : ''}.svg" width="12" height="12" alt="" aria-hidden="true">`;
// Section label in the v3 voice: orange mark, number, "( Name )".
const label = (num, text, tag = 'p') => `<${tag} class="label">${markImg()}${num ? `<span class="num">${num}</span>` : ''}( ${esc(text)} )</${tag}>`;

// Deterministic contour lines: an engineering nod (topographic survey) used as texture.
function contours({ w = 1200, h = 800, cx = 0.72, cy = 0.42, rings = 14, seed = 7, cls = 'contours' } = {}) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const harmonics = Array.from({ length: 5 }, (_, i) => ({ k: i + 2, a: (0.05 + rnd() * 0.07) / (i + 1) ** 0.6, ph: rnd() * Math.PI * 2 }));
  const paths = [];
  for (let r = 1; r <= rings; r++) {
    const base = (Math.min(w, h) * 0.07) * r ** 1.08;
    const pts = [];
    for (let t = 0; t < 96; t++) {
      const th = (t / 96) * Math.PI * 2;
      let f = 1;
      for (const hm of harmonics) f += hm.a * Math.sin(hm.k * th + hm.ph + r * 0.18);
      pts.push([cx * w + Math.cos(th) * base * f * 1.25, cy * h + Math.sin(th) * base * f]);
    }
    const d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
    paths.push(`<path d="${d}"${r % 5 === 0 ? ' class="idx"' : ''}/>`);
  }
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${paths.join('')}</svg>`;
}

function breadcrumbs(items) {
  // items: [[label, path], ...] last item is current
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items
    .map(([t, p], i) => (i === items.length - 1 ? `<li><span aria-current="page">${esc(t)}</span></li>` : `<li><a href="${p}">${esc(t)}</a></li>`))
    .join('')}</ol></nav>`;
}
const crumbLd = (items) => ({
  '@type': 'BreadcrumbList',
  '@id': U(items[items.length - 1][1]) + '#breadcrumb',
  itemListElement: items.map(([t, p], i) => ({ '@type': 'ListItem', position: i + 1, name: t, item: U(p) })),
});
const faqLd = (pairs, path) => ({
  '@type': 'FAQPage',
  '@id': U(path) + '#faq',
  mainEntity: pairs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

function faqList(pairs, { cat = '' } = {}) {
  return pairs
    .map(([q, a]) => `<details class="qa" data-reveal${cat ? ` data-cat="${esc(cat)}"` : ''}><summary><h3>${esc(q)}</h3><span class="qa-x" aria-hidden="true"></span></summary><div class="qa-a"><p>${esc(a)}</p></div></details>`)
    .join('');
}

function answerBox(text, label = 'In brief') {
  return `<aside class="answer" aria-label="${esc(label)}" data-reveal><p class="answer-k">${esc(label)}</p><p class="answer-t" data-speakable>${esc(text)}</p></aside>`;
}

function projectCard(p, { big = false, sizes = '(min-width: 900px) 45vw, 100vw' } = {}) {
  return `<article class="pcard${big ? ' pcard-big' : ''}" data-reveal data-type="${esc(p.type)}">
<a class="pcard-media" href="${projUrl(p)}" tabindex="-1" aria-hidden="true"><div class="zoom">${pic(p.cover, '', { sizes })}</div></a>
<p class="kicker">${esc(p.type)} · ${esc(p.city)}</p>
<h3 class="pcard-t"><a href="${projUrl(p)}">${esc(p.name)}</a></h3>
<p class="pcard-s">${esc(p.summary)}</p>
</article>`;
}

function ctaBand() {
  return '';
}

// ---------- JSON-LD base ----------
const orgLd = {
  '@type': ['Organization', 'ProfessionalService'],
  '@id': ORG,
  name: SITE.name,
  alternateName: ['SGI', 'Salcedo Group'],
  url: U('/'),
  logo: { '@type': 'ImageObject', url: U('/logo.png'), width: 720, height: 720 },
  image: U('/img/og-default.jpg'),
  description: SITE.description,
  telephone: SITE.tel,
  faxNumber: '+12144123089',
  identifier: SITE.registrations.map(([k, v]) => ({ '@type': 'PropertyValue', name: k, value: v })),
  foundingDate: SITE.founded,
  founder: { '@id': U('/firm/luis-salcedo/#person') },
  numberOfEmployees: { '@type': 'QuantitativeValue', value: SITE.employees },
  address: { '@type': 'PostalAddress', streetAddress: SITE.street, addressLocality: SITE.city, addressRegion: SITE.region, postalCode: SITE.zip, addressCountry: 'US' },
  hasMap: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${SITE.name} ${SITE.street} ${SITE.city} ${SITE.region} ${SITE.zip}`),
  areaServed: [
    { '@type': 'City', name: 'Dallas', sameAs: 'https://en.wikipedia.org/wiki/Dallas' },
    { '@type': 'City', name: 'Grand Prairie', sameAs: 'https://en.wikipedia.org/wiki/Grand_Prairie,_Texas' },
    { '@type': 'City', name: 'Fort Worth', sameAs: 'https://en.wikipedia.org/wiki/Fort_Worth,_Texas' },
    { '@type': 'AdministrativeArea', name: 'Dallas County, Texas', sameAs: 'https://en.wikipedia.org/wiki/Dallas_County,_Texas' },
    { '@type': 'Place', name: 'Dallas-Fort Worth metroplex', sameAs: 'https://en.wikipedia.org/wiki/Dallas%E2%80%93Fort_Worth_metroplex' },
  ],
  knowsAbout: ['Civil engineering', 'Land surveying', 'Geographic information systems', 'Hydrology', 'Hydraulic engineering', 'Stormwater management', 'Low-impact development', 'Floodplain management', 'Site development', 'Platting', 'Roadway design', 'Trail design'],
  slogan: 'Be a community resource and do high-quality work.',
  employee: PEOPLE.map((p) => ({ '@id': U(personUrl(p)) + '#person' })),
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Civil engineering and land surveying services',
    itemListElement: DISCIPLINES.map((d) => ({
      '@type': 'OfferCatalog',
      name: d.name,
      itemListElement: SERVICES.filter((s) => s.discipline === d.slug).map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', '@id': U(svcUrl(s)) + '#service', name: s.name } })),
    })),
  },
};
const websiteLd = { '@type': 'WebSite', '@id': WEBSITE, url: U('/'), name: SITE.name, publisher: { '@id': ORG }, inLanguage: 'en-US' };

// ---------- layout ----------
const NAV = [
  ['01', 'Firm', '/firm/', 'firm'],
  ['02', 'Services', '/services/', 'services'],
  ['03', 'Work', '/projects/', 'projects'],
  ['04', 'Places', '/where-we-work/', 'where'],
  ['05', 'FAQ', '/faq/', 'faq'],
  ['06', 'Contact', '/contact/', 'contact'],
];

function header(active) {
  const links = NAV.slice(0, 5);
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-h" data-header>
<a class="brand" href="/" aria-label="${SITE.name} home">${logo()}</a>
<nav class="nav" aria-label="Main"><ul>${links.map(([n, t, h, k]) => `<li><a href="${h}"${k === active ? ' aria-current="page"' : ''}><span class="num">${n}</span>${t}</a></li>`).join('')}</ul></nav>
<div class="h-actions"><a class="btn btn-sm" href="/contact/"${active === 'contact' ? ' aria-current="page"' : ''}>Request a proposal</a>
<button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-index" data-menu>Index</button></div>
<div class="progress" data-progress aria-hidden="true"></div>
</header>
<div class="index" id="site-index" role="dialog" aria-modal="true" aria-label="Site index" hidden data-index>
<div class="index-top"><span class="label-plain">( Index )</span><button type="button" class="index-x" aria-label="Close index" data-index-close><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button></div>
<ol class="index-list"><li><a href="/"><span class="num">00</span>Home</a></li>${NAV.map(([n, t, h, k]) => `<li><a href="${h}"${k === active ? ' aria-current="page"' : ''}><span class="num">${n}</span>${t}</a></li>`).join('')}</ol>
<a class="btn btn-lg" href="/contact/">Request a proposal</a>
<p class="index-foot">${markImg('', 'bm bm-14')}( ${SITE.city}, ${SITE.region} ) · <a href="tel:${SITE.tel}">${SITE.phone}</a></p>
</div>`;
}

function footer() {
  return `<footer class="site-f">
<a class="f-cta" href="/contact/">Request a proposal →</a>
<div class="f-grid">
<div class="f-brand"><a href="/" aria-label="${SITE.name} home">${logo('-cream')}</a><p class="f-k">Civil engineering, land surveying and GIS. ${SITE.city}, ${SITE.regionName}, since ${SITE.founded}.</p></div>
<div><p class="f-k">( Office )</p><address>${SITE.street}<br>${SITE.city}, ${SITE.regionName} ${SITE.zip}</address></div>
<div><p class="f-k">( Contact )</p><ul><li><a href="tel:${SITE.tel}" class="u">${SITE.phone}</a></li><li>Fax ${SITE.fax}</li><li><a href="/contact/" class="u">Request a proposal</a></li></ul></div>
<nav aria-label="Services"><p class="f-k">( Services )</p><ul>${SERVICES.map((x) => `<li><a href="${svcUrl(x)}">${esc(x.name)}</a></li>`).join('')}</ul></nav>
<nav aria-label="Work and places"><p class="f-k">( Work )</p><ul>${PROJECTS.map((x) => `<li><a href="${projUrl(x)}">${esc(x.short)}</a></li>`).join('')}</ul><p class="f-k f-k2">( Places )</p><ul>${PLACES.map((x) => `<li><a href="${placeUrl(x)}">${esc(x.name)}</a></li>`).join('')}</ul></nav>
<nav aria-label="Pages"><p class="f-k">( Pages )</p><ul><li><a href="/"><span class="num">00</span>Home</a></li>${NAV.map(([n, t, h]) => `<li><a href="${h}"><span class="num">${n}</span>${t}</a></li>`).join('')}${PEOPLE.map((x) => `<li><a href="${personUrl(x)}"><span class="num"></span>${esc(x.name)}</a></li>`).join('')}</ul></nav>
</div>
<div class="f-base"><img src="/brand/sgi-mark-cream.svg" width="20" height="20" alt="" aria-hidden="true">
<span>${SITE.registrations.map(([k, v]) => `${k} ${v}`).join(' · ')} · ${SITE.credentials.slice(2).join(' · ')}</span>
<span>© ${new Date().getFullYear()} ${SITE.name} · Design: Kija Creative</span></div>
</footer>`;
}

function page({ path, title, description, active = '', body, ld = [], image = 'og-default', type = 'WebPage', crumbs = null, about = null, extraHead = '', webpageExtra = {} }) {
  const fullTitle = path === '/' ? title : `${title} | SGI`;
  const ogImg = image === 'og-default' ? U('/img/og-default.jpg') : U(imgUrl(image));
  const webpage = {
    '@type': type,
    '@id': U(path) + '#webpage',
    url: U(path),
    name: fullTitle,
    description,
    isPartOf: { '@id': WEBSITE },
    publisher: { '@id': ORG },
    inLanguage: 'en-US',
    dateModified: TODAY,
    primaryImageOfPage: { '@type': 'ImageObject', url: ogImg },
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '[data-speakable]'] },
    ...(crumbs ? { breadcrumb: { '@id': U(path) + '#breadcrumb' } } : {}),
    ...(about ? { about } : { about: { '@id': ORG } }),
    ...webpageExtra,
  };
  const graph = [orgLd, websiteLd, webpage, ...(crumbs ? [crumbLd(crumbs)] : []), ...ld];
  return `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${U(path)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#135222">
<meta property="og:type" content="${type === 'ProfilePage' ? 'profile' : path === '/' ? 'website' : 'article'}">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:locale" content="en_US">
<meta property="og:url" content="${U(path)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${ogImg}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${ogImg}">
<meta name="geo.region" content="US-TX">
<meta name="geo.placename" content="Grand Prairie">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/logo.png">
<link rel="preload" as="image" href="/brand/sgi-lockup.svg">
<link rel="alternate" type="text/plain" title="LLM summary" href="/llms.txt">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/css/site.css">
<script>(function(d){d.classList.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('motion');setTimeout(function(){if(!window.__sgiMotion)d.classList.remove('motion')},2500)}})(document.documentElement);</script>
${extraHead}<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>
</head>
<body>
${header(active)}
<main id="main">
${body}
</main>
${footer()}
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>
<script src="/js/site.js" defer></script>
<script src="/js/benchmarks.js" defer></script>
</body>
</html>
`;
}

// ---------- pages ----------
const pages = [];
const add = (path, html) => pages.push([path, html]);

// Home
{
  const heroSlides = ['grand-prairie-city-hall', 'camp-wisdom-road', 'harold-simmons-park', 'hi-line-connection'].map(byProject);
  const homeFaq = [FAQ[0][1][0], FAQ[1][1][0], FAQ[0][1][2], FAQ[3][1][0]];
  const steps = [
    ['01', 'Survey', 'Our own crews are first on site. Boundary, topography and utilities are measured before a line is designed.', 'topographic-surveys-3d-modeling'],
    ['02', 'Design', 'Paving, drainage, utilities and grading are drawn against real conditions, with hydrology and hydraulics where water is involved.', 'paving-drainage-utility-design'],
    ['03', 'Review', 'A QA/QC manager is assigned to every project, and the Principal-in-Charge leads frequent quality-review sessions.', 'municipal-engineering-design'],
    ['04', 'Build', 'Staking, submittal review, RFIs and inspection. We stay until the last one leaves the site.', 'construction-staking-inspection'],
  ];
  const body = `
<section class="hero" aria-labelledby="hero-h">
${contours({ seed: 7 })}
<div class="wrap hero-in">
<div class="hero-copy">
<p class="eyebrow" data-hero-fade>Grand Prairie, Texas · Since ${SITE.founded}</p>
<h1 id="hero-h" class="h1" data-split>Civil engineering, land surveying and GIS for North Texas.</h1>
<p class="lede" data-hero-fade data-speakable>${esc(SITE.description)}</p>
<div class="actions" data-hero-fade><a class="btn" href="/projects/">See our work ${arrow}</a><a class="btn btn-ghost" href="/contact/">Request a proposal</a></div>
</div>
<div class="hero-stage" data-slides aria-roledescription="carousel" aria-label="Featured projects">
${heroSlides
  .map(
    (p, i) => `<figure class="slide${i === 0 ? ' is-on' : ''}" aria-roledescription="slide" aria-label="${i + 1} of ${heroSlides.length}"${i ? ' aria-hidden="true"' : ''}>${pic(p.cover, p.alts[0], { eager: i === 0, sizes: '(min-width: 900px) 55vw, 100vw' })}<figcaption><a href="${projUrl(p)}"${i ? ' tabindex="-1"' : ''}>${esc(p.short)}</a><span>${esc(p.client)}</span></figcaption></figure>`
  )
  .join('')}
<div class="slide-dots" role="group" aria-label="Choose slide">${heroSlides.map((p, i) => `<button type="button" aria-label="Show ${esc(p.short)}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('')}</div>
</div>
</div>
</section>

<section class="stats" aria-label="Firm at a glance"><dl class="wrap stats-in">
<div><dt>Founded in Grand Prairie</dt><dd data-count="2002" data-from="1990">2002</dd></div>
<div><dt>Engineers, surveyors and staff</dt><dd data-count="10">10</dd></div>
<div><dt>In-house survey crews</dt><dd data-count="2">2</dd></div>
<div><dt>Camp Wisdom Road, SGI as prime</dt><dd data-count="21" data-prefix="$" data-suffix="M">$21M</dd></div>
</dl></section>

<section class="marquee" aria-label="Clients and partners"><p class="sr">Clients and partners include ${CLIENTS.join(', ')}.</p>
<div class="marquee-track" aria-hidden="true">${[...CLIENTS, ...CLIENTS].map((c) => `<span>${esc(c)}</span>`).join('')}</div></section>

<section class="wrap split" aria-labelledby="firm-h">
<div class="split-copy" data-reveal><span class="tick"></span>
<h2 id="firm-h" class="h2">A firm built on family and experience.</h2>
<p>Salcedo Group, Inc. gives clients the attention of a small firm with the production of a large one. Chief Executive Officer Luis Salcedo has more than 40 years as an engineer; his son Michael, now president, has more than 25.</p>
<p>The credo is simple: be a community resource and do high-quality work.</p>
<a class="link" href="/firm/">About the firm and team ${arrow}</a></div>
<figure class="split-media" data-reveal><div class="parallax" data-parallax>${pic('salcedo-family', 'The Salcedo family at the SGI Grand Prairie office', { sizes: '(min-width: 900px) 50vw, 100vw' })}</div><figcaption>SGI Grand Prairie office, ribbon cutting 2019.</figcaption></figure>
</section>

<section class="process" aria-labelledby="proc-h" data-process>
<div class="process-pin">
<div class="wrap process-head"><p class="eyebrow eyebrow-light">How we work</p><h2 id="proc-h" class="h2">From the first one on site to the last one to leave.</h2></div>
<ol class="process-track" data-track>
${steps.map(([n, t, d, s]) => `<li class="step"><span class="step-n">${n}</span><h3>${t}</h3><p>${esc(d)}</p><a class="link link-light" href="${svcUrl(byService(s))}">${esc(byService(s).name)} ${arrow}</a></li>`).join('')}
</ol>
</div>
</section>

<section class="services-home" aria-labelledby="svc-h"><div class="wrap">
<div class="sec-head"><h2 id="svc-h" class="h2" data-reveal>What we do</h2><a class="link" href="/services/">All services ${arrow}</a></div>
<div class="disc-grid">
${DISCIPLINES.map(
  (d) => `<div class="disc" data-reveal><h3 class="h3"><a href="/services/${d.slug}/">${esc(d.name)}</a></h3><p>${esc(d.intro)}</p><ul class="svc-list">${SERVICES.filter((s) => s.discipline === d.slug)
    .map((s) => `<li><a href="${svcUrl(s)}"><span>${esc(s.name)}</span>${arrow}</a></li>`)
    .join('')}</ul></div>`
).join('')}
</div></div></section>

<section class="wrap featured" aria-labelledby="proj-h">
<div class="sec-head"><h2 id="proj-h" class="h2" data-reveal>Featured projects</h2><a class="link" href="/projects/">All projects ${arrow}</a></div>
<div class="pgrid pgrid-feature">${PROJECTS.map((p, i) => projectCard(p, { big: i === 0 })).join('')}</div>
</section>

<section class="quote" aria-label="From our president"><div class="wrap quote-in" data-reveal>
<blockquote><p>“My father has taught us to be a resource to our community. The projects we work on mean something to somebody. It might be a land-development project to us, but to our clients this could be a major undertaking in their life.”</p></blockquote>
<p class="quote-by"><a href="/firm/michael-salcedo/">Michael A. Salcedo, PE, RPLS</a>, President</p></div></section>

<section class="wrap faq-teaser" aria-labelledby="hfaq-h">
<div class="sec-head"><h2 id="hfaq-h" class="h2" data-reveal>Common questions</h2><a class="link" href="/faq/">All questions ${arrow}</a></div>
<div class="qa-list">${faqList(homeFaq)}</div>
</section>
${ctaBand()}`;
  add('/', page({ path: '/', title: 'Salcedo Group, Inc. | Civil engineering and land surveying, DFW', description: 'Family-owned, minority-owned civil engineering, land surveying and GIS firm in Grand Prairie, TX, serving public and private clients across DFW since 2002.', body, ld: [faqLd(homeFaq, '/')] }));
}

// Firm (v3 design: firm.dc.html)
{
  const crumbs = [['Home', '/'], ['Firm', '/firm/']];
  const years = new Date().getFullYear() - +SITE.founded;
  const promises = [
    ['One firm', 'Survey and design under one roof: no handoff, no coordination gap and no subconsultant markup on the survey.'],
    ['A principal on every project', 'Luis and Michael Salcedo are named on every project team, and a principal reviews every request before it is answered.'],
    ['Inside the right of way', 'Camp Wisdom Road was designed with no additional right-of-way acquisition. Designing inside the existing ROW is how a schedule keeps its months.'],
  ];
  const [luis, michael] = PEOPLE;
  const principal = (p, line, note) => `<figure class="principal"><a href="${personUrl(p)}" class="frame frame-34" data-motion="frame" tabindex="-1" aria-hidden="true">${pic(p.img, '', { sizes: '300px' })}</a>
<figcaption><a class="principal-n" href="${personUrl(p)}">${esc(fullName(p))}</a><span class="meta">${esc(line)}</span><span class="principal-b">${esc(note)}</span></figcaption></figure>`;
  const more = [
    ['02', 'Services', '/services/', 'Civil engineering, land surveying, hydrology, GIS and construction administration.'],
    ['03', 'Work', '/projects/', 'Public projects in Dallas, Dallas County and Grand Prairie.'],
    ['04', 'Places', '/where-we-work/', 'Where SGI works: Dallas, Grand Prairie and Dallas County.'],
    ['06', 'Contact', '/contact/', 'Request a proposal. A principal replies within two business days.'],
  ];
  const body = `
<div class="v3">${breadcrumbs(crumbs)}
<section class="sec firm-hero" aria-labelledby="firm-title">
<div class="firm-grid">
<div class="stack-28">
<p class="label rise-in">${markImg()}<span class="num">01</span>( Firm )</p>
<h1 id="firm-title" class="d1 rise-in d1-delay">Survey and design, one firm<span class="dot">.</span></h1>
<p class="lead rise-in d2-delay" data-speakable>Two principals hold both a PE and an RPLS. The crew that measures your site works down the hall from the engineers who design it, so there is no handoff, no coordination gap and no subconsultant markup.</p>
</div>
<div class="stack-20 firm-side rise-in d3-delay">
<p>${years} years designing the streets, drainage, parks and trails of Dallas, Dallas County and Grand Prairie. Two in-house survey crews and both seals under one roof.</p>
<ul class="facts-rule meta">
<li>Founded by Luis M. Salcedo in ${SITE.founded}</li>
<li>${SITE.street}, ${SITE.city}, ${SITE.regionName}</li>
<li>NCTRCA certified M/DBE, TxDOT precertified</li>
<li>PE licensure in ${SITE.peStates.slice(0, -1).join(', ')} and ${SITE.peStates.slice(-1)}</li>
</ul>
</div>
</div>
<figure class="wide-fig"><div class="frame frame-wide" data-motion="frame">${pic('grand-prairie-1', 'Grand Prairie City Hall, engineer of record Salcedo Group, Inc.', { eager: true, sizes: '100vw' })}</div>
<figcaption class="meta">( <a href="/projects/grand-prairie-city-hall/">Grand Prairie Municipal Campus and New City Hall</a>, 11 acres downtown. SGI is engineer of record, a block from our own office. )</figcaption></figure>
</section>

<section class="sec sec-sand promise" aria-labelledby="promise-title">
<div class="promise-type" data-scene="promise">
${[1, 2, 3].map((i) => `<span class="promise-word promise-copy" data-promise-copy aria-hidden="true" style="z-index:${5 - i}">Sealed</span>`).join('')}
<h2 id="promise-title" class="promise-word" data-promise-word>Sealed</h2>
</div>
<div class="stack-48 promise-body">
<p class="lead lead-label"><span class="label label-inline">${markImg()}<span class="num">02</span>( Promise )</span>Both seals, engineer and surveyor, under one roof. Three things that means for a client.</p>
<ul class="promises">${promises.map(([t, b]) => `<li data-motion="rise"><span class="promise-rule" aria-hidden="true">${markImg('', 'bm bm-18')}<span></span></span><h3 class="h-m">${esc(t)}</h3><p>${esc(b)}</p></li>`).join('')}</ul>
</div>
</section>

<section class="sec" aria-labelledby="principals-title">
<div class="split-end">
<h2 id="principals-title" class="d2" data-motion="rise">The people who propose are the people on site</h2>
<p class="lead lead-label" data-motion="rise"><span class="label label-inline">${markImg()}<span class="num">03</span>( Principals )</span>Two generations of the Salcedo family, both registered as engineer and surveyor. A principal reviews every request.</p>
</div>
<div class="principals">
${principal(luis, 'Founder · since ' + SITE.founded, 'Founded SGI in his home office in 2002 and holds registrations as both engineer and surveyor.')}
${principal(michael, 'President', 'Second generation of the firm. Leads survey in the field and design in the office.')}
<figure class="quote-card" data-motion="rise"><blockquote>“As surveyor, I'm the first person who puts boots on ground. We survey the project, measure the lot, then we bring it into the office and do all the engineering design work.”</blockquote><figcaption class="meta">${esc(fullName(michael))} · President</figcaption></figure>
</div>
<figure class="family"><div class="frame frame-43" data-motion="frame">${pic('salcedo-family', 'The Salcedo family at the SGI office in Grand Prairie', { sizes: '(min-width: 900px) 50vw, 100vw' })}</div>
<figcaption class="meta">( The Salcedo family at the SGI office, ${SITE.street}, ${SITE.city}. )</figcaption></figure>
<div class="staff-v3" data-motion="rise">${STAFF.map((g) => `<div><p class="meta">( ${esc(g.k)} )</p>${g.v.map((n) => `<p>${esc(n)}</p>`).join('')}</div>`).join('')}</div>
</section>

<nav class="sec more" aria-labelledby="more-title">
<h2 id="more-title" class="label">${markImg()}( More from Salcedo Group )</h2>
<ul class="more-list">${more.map(([n, t, h, d]) => `<li><a href="${h}"><span class="num">${n}</span><span class="more-t"><span class="h-m">${t}</span><span class="more-d">${esc(d)}</span></span><span class="arr" aria-hidden="true">→</span></a></li>`).join('')}</ul>
</nav>
</div>`;
  add('/firm/', page({ path: '/firm/', title: 'The firm: survey and design under one roof, Grand Prairie, TX', description: 'About Salcedo Group, Inc.: founded 2002 in Grand Prairie, Texas. Two principals registered as both PE and RPLS, two in-house survey crews, both seals under one roof.', active: 'firm', body, type: 'AboutPage', crumbs, image: 'grand-prairie-1' }));
}

// People
for (const p of PEOPLE) {
  const path = personUrl(p);
  const crumbs = [['Home', '/'], ['Firm', '/firm/'], [p.name, path]];
  const projs = p.experience.map(byProject);
  const personLd = {
    '@type': 'Person',
    '@id': U(path) + '#person',
    name: p.name,
    honorificSuffix: p.creds,
    jobTitle: p.role,
    worksFor: { '@id': ORG },
    image: U(imgUrl(p.img)),
    url: U(path),
    description: p.summary,
    alumniOf: p.alumni.map((a) => ({ '@type': 'CollegeOrUniversity', name: a })),
    hasCredential: p.registrations.map(([abbr, n]) => ({ '@type': 'EducationalOccupationalCredential', credentialCategory: 'license', name: `${n} (${abbr})` })),
    knowsAbout: p.knowsAbout,
  };
  const body = `
<section class="page-head wrap">${breadcrumbs(crumbs)}
<div class="bio-head"><div class="bio-img" data-reveal>${pic(p.img, `Portrait of ${p.name}`, { eager: true, sizes: '240px' })}</div>
<div><p class="eyebrow">${esc(p.role)}</p><h1 class="h1 h1-page" data-split>${esc(p.name)}</h1>
<ul class="chips chips-dark">${p.registrations.map(([a, n]) => `<li><abbr title="${esc(n)}">${a}</abbr> ${esc(n)}</li>`).join('')}</ul></div></div>
${answerBox(p.summary, 'Profile')}
</section>
<section class="wrap bio-body">
<div class="prose" data-reveal>${p.bio.map((b) => `<p>${esc(b)}</p>`).join('')}</div>
<aside class="facts" data-reveal><h2 class="kicker">Education</h2><ul>${p.education.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
${p.highlights.length ? `<h2 class="kicker">Career highlights</h2><ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}</aside>
</section>
<section class="wrap" aria-labelledby="ph-h"><div class="sec-head"><h2 id="ph-h" class="h2" data-reveal>Project history at SGI</h2><a class="link" href="/firm/#team">Meet the full team ${arrow}</a></div>
<div class="pgrid">${projs.map((x) => projectCard(x)).join('')}</div>
${p.otherExperience.length ? `<p class="note">Also: ${p.otherExperience.map(esc).join(', ')}.</p>` : ''}
</section>
${ctaBand()}`;
  add(path, page({ path, title: `${p.name}, ${p.creds}, ${p.role}`, description: p.summary.slice(0, 158), active: 'firm', body, type: 'ProfilePage', crumbs, image: p.img, about: { '@id': U(path) + '#person' }, ld: [personLd] }));
}

// Services hub
{
  const crumbs = [['Home', '/'], ['Services', '/services/']];
  const body = `
<section class="page-head wrap">${breadcrumbs(crumbs)}<span class="tick"></span>
<h1 class="h1 h1-page" data-split>Services</h1>
<p class="lede" data-speakable>Civil engineering spans water resources, transportation, geotechnical, structural and environmental work. SGI’s 10 employees bring a broad base of knowledge to it, with civil engineering and land surveying under one roof.</p>
</section>
${DISCIPLINES.map(
  (d, i) => `<section class="${i % 2 ? 'band band-mist' : 'band'}" id="${d.slug}" aria-labelledby="${d.slug}-h"><div class="wrap">
<div class="split split-top"><div data-reveal><h2 id="${d.slug}-h" class="h2"><a href="/services/${d.slug}/">${esc(d.name)}</a></h2><p>${esc(d.intro)}</p><a class="link" href="/services/${d.slug}/">${esc(d.name)} overview ${arrow}</a></div>
<ul class="svc-rows" data-reveal>${SERVICES.filter((s) => s.discipline === d.slug)
    .map((s) => `<li><a href="${svcUrl(s)}"><h3>${esc(s.name)}</h3><p>${esc(s.lede)}</p>${arrow}</a></li>`)
    .join('')}</ul></div></div></section>`
).join('')}
<section class="wrap split" aria-labelledby="qa-h"><h2 id="qa-h" class="h2" data-reveal>Quality review on every project</h2>
<div data-reveal><p>Michael Salcedo believes peer review is essential to a project’s success. SGI holds frequent quality-review sessions, led by the Principal-in-Charge, to engage the design team on every aspect of the project.</p>
<p>A QA/QC manager oversees each project, and project engineers perform internal reviews throughout. These reviews keep projects on schedule and construction costs within budget.</p></div></section>
${ctaBand()}`;
  const ld = [{ '@type': 'ItemList', '@id': U('/services/') + '#list', name: 'Services', itemListElement: SERVICES.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: U(svcUrl(s)), name: s.name })) }];
  add('/services/', page({ path: '/services/', title: 'Civil engineering and land surveying services', description: 'Municipal design, paving, drainage, utilities, hydrology and hydraulics, site development, corridor design, boundary and topographic surveys and staking in DFW.', active: 'services', body, type: 'CollectionPage', crumbs, ld }));
}

// Discipline pages
for (const d of DISCIPLINES) {
  const path = `/services/${d.slug}/`;
  const crumbs = [['Home', '/'], ['Services', '/services/'], [d.name, path]];
  const svcs = SERVICES.filter((s) => s.discipline === d.slug);
  const projs = [...new Set(svcs.flatMap((s) => s.projects))].map(byProject);
  const faqs = svcs.flatMap((s) => s.faqs).slice(0, 6);
  const body = `
<section class="page-head wrap">${breadcrumbs(crumbs)}<span class="tick"></span>
<h1 class="h1 h1-page" data-split>${esc(d.title)}</h1>
<p class="lede">${esc(d.intro)}</p>
${answerBox(d.answer)}
</section>
<section class="wrap" aria-labelledby="sv-h"><h2 id="sv-h" class="h2" data-reveal>What we provide</h2>
<ul class="svc-rows svc-rows-wide" data-reveal>${svcs.map((s) => `<li><a href="${svcUrl(s)}"><h3>${esc(s.name)}</h3><p>${esc(s.lede)}</p>${arrow}</a></li>`).join('')}</ul></section>
<section class="band band-mist" aria-labelledby="rp-h"><div class="wrap"><h2 id="rp-h" class="h2" data-reveal>Related projects</h2>
<div class="pgrid">${projs.map((p) => projectCard(p)).join('')}</div></div></section>
<section class="wrap faq-teaser" aria-labelledby="df-h"><h2 id="df-h" class="h2" data-reveal>Questions about ${esc(d.name.toLowerCase())}</h2><div class="qa-list">${faqList(faqs)}</div></section>
${ctaBand()}`;
  const ld = [
    { '@type': 'Service', '@id': U(path) + '#service', name: d.name, serviceType: d.name, description: d.answer, provider: { '@id': ORG }, areaServed: orgLd.areaServed, hasOfferCatalog: { '@type': 'OfferCatalog', name: d.name, itemListElement: svcs.map((s) => ({ '@type': 'Offer', itemOffered: { '@id': U(svcUrl(s)) + '#service' } })) } },
    faqLd(faqs, path),
  ];
  add(path, page({ path, title: d.title, description: d.answer.slice(0, 158), active: 'services', body, crumbs, ld, about: { '@id': U(path) + '#service' } }));
}

// Service pages
for (const s of SERVICES) {
  const d = discOf(s);
  const path = svcUrl(s);
  const crumbs = [['Home', '/'], ['Services', '/services/'], [d.name, `/services/${d.slug}/`], [s.name, path]];
  const projs = s.projects.map(byProject);
  const lead = s.discipline === 'land-surveying' ? byPerson('michael-salcedo') : byPerson('luis-salcedo');
  const devs = s.devNote ? DEV.filter((x) => x.scope !== 'In design').slice(0, 4) : [];
  const body = `
<section class="page-head wrap">${breadcrumbs(crumbs)}<span class="tick"></span>
<p class="eyebrow">${esc(d.name)}</p>
<h1 class="h1 h1-page" data-split>${esc(s.name)}</h1>
<p class="lede" data-speakable>${esc(s.lede)}</p>
</section>
<section class="wrap split split-top" aria-labelledby="what-h">
<div class="prose" data-reveal><h2 id="what-h" class="h3">What is ${esc(s.name.toLowerCase())}?</h2><p>${esc(s.what)}</p></div>
<div data-reveal><h2 class="h3">When clients need it</h2><ul class="ticks">${s.when.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>
</section>
<section class="band band-ink" aria-labelledby="how-h">${contours({ cx: 0.9, cy: 0.3, rings: 12, seed: s.slug.length * 13, cls: 'contours contours-dark' })}<div class="wrap">
<h2 id="how-h" class="h2" data-reveal>How SGI approaches it</h2>
<ol class="steps">${s.how.map(([t, x], i) => `<li data-reveal><span class="step-n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(t)}</h3><p>${esc(x)}</p></li>`).join('')}</ol></div></section>
<section class="wrap" aria-labelledby="rp-h"><div class="sec-head"><h2 id="rp-h" class="h2" data-reveal>Projects that show this work</h2><a class="link" href="/projects/">All projects ${arrow}</a></div>
<div class="pgrid">${projs.map((p) => projectCard(p)).join('')}</div>
${devs.length ? `<p class="note">Land development: ${devs.map((x) => `${esc(x.name)} (${esc(x.city)})`).join(', ')}. <a href="/projects/#land-development">See land development work</a>.</p>` : ''}
</section>
<section class="band band-mist" aria-labelledby="lead-h"><div class="wrap lead-row" data-reveal>
<div class="lead-img">${pic(lead.img, `Portrait of ${lead.name}`, { sizes: '120px' })}</div>
<div><h2 id="lead-h" class="kicker">Who leads it</h2><p class="h3"><a href="${personUrl(lead)}">${esc(fullName(lead))}</a></p><p>${esc(lead.role)}. ${esc(lead.summary.split('. ')[1] || '')}</p></div>
</div></section>
<section class="wrap faq-teaser" aria-labelledby="sf-h"><h2 id="sf-h" class="h2" data-reveal>Frequently asked</h2><div class="qa-list">${faqList(s.faqs)}</div>
<p class="note">Related: ${SERVICES.filter((x) => x.discipline === s.discipline && x !== s).map((x) => `<a href="${svcUrl(x)}">${esc(x.name)}</a>`).join(' · ')}</p></section>
${ctaBand()}`;
  const ld = [
    { '@type': 'Service', '@id': U(path) + '#service', name: s.name, serviceType: s.name, description: `${s.lede} ${s.what}`, provider: { '@id': ORG }, areaServed: orgLd.areaServed, category: d.name, isRelatedTo: { '@id': U(`/services/${d.slug}/`) + '#service' } },
    faqLd(s.faqs, path),
  ];
  add(path, page({ path, title: `${s.name} in DFW`, description: `${s.lede}`.slice(0, 158), active: 'services', body, crumbs, ld, image: projs[0].cover, about: { '@id': U(path) + '#service' } }));
}

// Projects index
{
  const crumbs = [['Home', '/'], ['Projects', '/projects/']];
  const types = ['All', ...new Set(PROJECTS.map((p) => p.type))];
  const body = `
<section class="page-head wrap">${breadcrumbs(crumbs)}<span class="tick"></span>
<h1 class="h1 h1-page" data-split>Projects</h1>
<p class="lede" data-speakable>SGI has worked as prime consultant on roadway design, storm drainage, water and sewer, site development, trail and bicycle/pedestrian facilities, and park layouts throughout Dallas-Fort Worth.</p>
<div class="filters" role="group" aria-label="Filter projects by type" data-filters>${types.map((t, i) => `<button type="button" data-f="${esc(t)}" aria-pressed="${i === 0}">${esc(t)}<span class="count">${t === 'All' ? PROJECTS.length : PROJECTS.filter((p) => p.type === t).length}</span></button>`).join('')}</div>
</section>
<section class="wrap" aria-label="Project list"><div class="pgrid pgrid-2" data-filter-grid>${PROJECTS.map((p) => projectCard(p, { sizes: '(min-width: 900px) 45vw, 100vw' })).join('')}</div>
<p class="sr" role="status" data-filter-status></p></section>
<section id="land-development" class="band band-mist" aria-labelledby="dev-h"><div class="wrap">
<div class="sec-head"><h2 id="dev-h" class="h2" data-reveal>Land development</h2><a class="link" href="/services/civil-engineering/site-development/">Site development services ${arrow}</a></div>
<div class="dev-grid">${DEV.map((x) => `<article class="dev" data-reveal><div class="zoom">${pic(x.img, x.name, { sizes: '(min-width: 900px) 22vw, 50vw' })}</div><h3>${esc(x.name)}</h3><p>${esc(x.city)} · ${esc(x.scope)}</p></article>`).join('')}</div></div></section>
${ctaBand()}`;
  const ld = [{ '@type': 'ItemList', '@id': U('/projects/') + '#list', name: 'Featured projects', itemListElement: PROJECTS.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: U(projUrl(p)), name: p.name })) }];
  add('/projects/', page({ path: '/projects/', title: 'Projects: parks, streets, trails and civic work', description: 'SGI civil engineering and surveying projects: Pacific Plaza, Camp Wisdom Road, Harold Simmons Park, Hi Line Connection, Beckley at Commerce, Grand Prairie City Hall.', active: 'projects', body, type: 'CollectionPage', crumbs, ld }));
}

// Project pages
PROJECTS.forEach((p, i) => {
  const path = projUrl(p);
  const crumbs = [['Home', '/'], ['Projects', '/projects/'], [p.short, path]];
  const prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  const place = PLACES.find((x) => 'jurisdiction:' + x.slug === p.place);
  const team = PEOPLE.filter((x) => x.experience.includes(p.slug));
  const body = `
<section class="page-head wrap">${breadcrumbs(crumbs)}
<p class="eyebrow">${esc(p.type)} · ${esc(p.client)} · ${esc(p.city)}, TX</p>
<h1 class="h1 h1-page h1-project" data-split>${esc(p.name)}</h1>
</section>
<section class="wrap gallery" aria-label="Project images" data-gallery>
<div class="g-main">${p.imgs.map((im, k) => `<figure class="g-slide${k === 0 ? ' is-on' : ''}"${k ? ' aria-hidden="true"' : ''}>${pic(im, p.alts[k] || p.name, { eager: k === 0, sizes: '(min-width: 1320px) 1240px, 100vw' })}</figure>`).join('')}
<div class="g-nav"><button type="button" data-g="prev" aria-label="Previous image">←</button><span data-g-count>1 / ${p.imgs.length}</span><button type="button" data-g="next" aria-label="Next image">→</button></div></div>
<div class="g-thumbs" role="group" aria-label="Choose image">${p.imgs.map((im, k) => `<button type="button" aria-label="Show image ${k + 1}: ${esc(p.alts[k] || p.name)}"${k === 0 ? ' aria-current="true"' : ''}>${pic(im, '', { sizes: '140px' })}</button>`).join('')}</div>
</section>
<section class="wrap project-body">
<div class="prose">${answerBox(p.answer)}
${p.highlights ? `<ul class="hl">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
${p.body.map((b) => `<p data-reveal>${esc(b)}</p>`).join('')}</div>
<aside class="facts facts-sticky" aria-label="Project facts"><dl>${p.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
<h2 class="kicker">Services</h2><ul class="facts-links">${p.services.map((s) => `<li><a href="${svcUrl(byService(s))}">${esc(byService(s).name)}</a></li>`).join('')}</ul>
${team.length ? `<h2 class="kicker">SGI team</h2><ul class="facts-links">${team.map((t) => `<li><a href="${personUrl(t)}">${esc(fullName(t))}</a></li>`).join('')}</ul>` : ''}
${place ? `<h2 class="kicker">Location</h2><ul class="facts-links"><li><a href="${placeUrl(place)}">${esc(place.full)}</a></li></ul>` : ''}</aside>
</section>
<nav class="pn" aria-label="More projects"><div class="wrap pn-in">
<a href="${projUrl(prev)}" rel="prev"><span>← Previous project</span><strong>${esc(prev.short)}</strong></a>
<a href="${projUrl(next)}" rel="next" class="pn-next"><span>Next project →</span><strong>${esc(next.short)}</strong></a></div></nav>
${ctaBand()}`;
  const ld = [
    {
      '@type': 'CreativeWork',
      '@id': U(path) + '#project',
      name: p.name,
      headline: p.name,
      description: p.answer,
      abstract: p.summary,
      genre: `${p.type} civil engineering project`,
      creator: { '@id': ORG },
      contributor: team.map((t) => ({ '@id': U(personUrl(t)) + '#person' })),
      funder: { '@type': 'Organization', name: p.client },
      image: p.imgs.map((im) => U(imgUrl(im))),
      locationCreated: { '@type': 'Place', name: `${p.city}, Texas`, address: { '@type': 'PostalAddress', addressLocality: p.city, addressRegion: 'TX', addressCountry: 'US' } },
      ...(p.year ? { dateCreated: p.year } : {}),
      creativeWorkStatus: p.status,
      keywords: p.services.map((s) => byService(s).name).join(', '),
      url: U(path),
    },
  ];
  add(path, page({ path, title: `${p.short}, ${p.city}, TX`, description: p.answer.slice(0, 158).replace(/\s\S*$/, '') + '…', active: 'projects', body, crumbs, ld, image: p.cover, about: { '@id': U(path) + '#project' } }));
});

// Where we work hub + places
{
  const crumbs = [['Home', '/'], ['Where we work', '/where-we-work/']];
  const body = `
<section class="page-head wrap">${breadcrumbs(crumbs)}<span class="tick"></span>
<h1 class="h1 h1-page" data-split>Where we work</h1>
<p class="lede" data-speakable>SGI is based at ${SITE.street} in ${SITE.city}, Texas, about 15 minutes southwest of downtown Dallas, and works throughout Dallas-Fort Worth and North Texas.</p>
</section>
<section class="wrap" aria-label="Jurisdictions"><ul class="places">${PLACES.map(
    (pl) => `<li data-reveal><a href="${placeUrl(pl)}"><div class="zoom">${pic(byProject(pl.projects[0]).cover, '', { sizes: '(min-width: 900px) 30vw, 100vw' })}</div><h2 class="h3">${esc(pl.full)}</h2><p>${esc(pl.lede)}</p><span class="link">${pl.projects.length} featured projects ${arrow}</span></a></li>`
  ).join('')}</ul>
<p class="note">Land development work also includes Fort Worth (Hotel Revel) and Balch Springs (Peachtree Apartments).</p></section>
${ctaBand()}`;
  add('/where-we-work/', page({ path: '/where-we-work/', title: 'Where we work: Dallas, Grand Prairie and Dallas County', description: 'SGI provides civil engineering and land surveying across Dallas-Fort Worth from its Grand Prairie office, for the City of Dallas, Grand Prairie and Dallas County.', active: 'where', body, type: 'CollectionPage', crumbs }));
}
for (const pl of PLACES) {
  const path = placeUrl(pl);
  const crumbs = [['Home', '/'], ['Where we work', '/where-we-work/'], [pl.full, path]];
  const projs = pl.projects.map(byProject);
  const devs = DEV.filter((x) => x.city === pl.devCity);
  const placeLd = { '@type': pl.slug === 'dallas-county' ? 'AdministrativeArea' : 'City', '@id': U(path) + '#place', name: pl.full, sameAs: pl.wiki, containedInPlace: { '@type': 'State', name: 'Texas' } };
  const body = `
<section class="page-head wrap">${breadcrumbs(crumbs)}<span class="tick"></span>
<p class="eyebrow">Where we work</p>
<h1 class="h1 h1-page" data-split>Civil engineering and land surveying in ${esc(pl.name)}</h1>
<p class="lede">${esc(pl.lede)}</p>
${answerBox(pl.answer)}
</section>
<section class="wrap" aria-labelledby="np-h"><h2 id="np-h" class="h2" data-reveal>Named projects in ${esc(pl.name)}</h2>
<div class="pgrid">${projs.map((p) => projectCard(p)).join('')}</div></section>
<section class="band band-mist" aria-labelledby="lp-h"><div class="wrap split split-top">
<h2 id="lp-h" class="h2" data-reveal>Local experience</h2>
<div data-reveal><p>${esc(pl.body)}</p>
${devs.length ? `<p>Land development in ${esc(pl.devCity)}: ${devs.map((x) => `${esc(x.name)} (${esc(x.scope.toLowerCase())})`).join('; ')}.</p>` : ''}
<p>Services offered here: ${SERVICES.map((s) => `<a href="${svcUrl(s)}">${esc(s.name.toLowerCase())}</a>`).join(', ')}.</p></div></div></section>
${ctaBand(`Assembling a ${pl.name} shortlist? Call a principal or send the RFQ.`)}`;
  add(path, page({ path, title: `Civil engineers and land surveyors in ${pl.name}, TX`, description: pl.answer.slice(0, 158).replace(/\s\S*$/, '') + '…', active: 'where', body, crumbs, ld: [placeLd], image: projs[0].cover, about: [{ '@id': U(path) + '#place' }, { '@id': ORG }] }));
}

// FAQ
{
  const crumbs = [['Home', '/'], ['FAQ', '/faq/']];
  const all = FAQ.flatMap(([, qs]) => qs);
  const body = `
<section class="page-head wrap">${breadcrumbs(crumbs)}<span class="tick"></span>
<h1 class="h1 h1-page" data-split>Frequently asked questions</h1>
<p class="lede">Straight answers about who SGI is, where it works, what it does and how to start a project.</p>
<div class="faq-tools"><label class="search"><span class="sr">Search questions</span><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="search" placeholder="Search questions" data-faq-search autocomplete="off"></label>
<div class="filters" role="group" aria-label="Filter by topic" data-faq-cats><button type="button" data-f="All" aria-pressed="true">All</button>${FAQ.map(([c]) => `<button type="button" data-f="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}</div></div>
</section>
<section class="wrap faq-page" aria-label="Questions and answers">
${FAQ.map(([c, qs]) => `<div class="faq-group" data-group="${esc(c)}"><h2 class="kicker">${esc(c)}</h2><div class="qa-list">${faqList(qs, { cat: c })}</div></div>`).join('')}
<p class="faq-empty" data-faq-empty hidden>No questions match. Call <a href="tel:${SITE.tel}">${SITE.phone}</a> and ask a principal directly.</p>
<p class="sr" role="status" data-faq-status></p>
</section>
${ctaBand('Still have a question? A principal will answer it.')}`;
  add('/faq/', page({ path: '/faq/', title: 'FAQ: civil engineering and surveying with SGI', description: 'Answers about Salcedo Group, Inc.: services, M/DBE certification, location in Grand Prairie, areas served, quality control and how to request a proposal.', active: 'faq', body, type: 'FAQPage', crumbs, webpageExtra: { mainEntity: faqLd(all, '/faq/').mainEntity } }));
}

// Contact
{
  const crumbs = [['Home', '/'], ['Contact', '/contact/']];
  const body = `
<section class="wrap contact">
<div class="contact-copy">${breadcrumbs(crumbs)}<span class="tick"></span>
<h1 class="h1 h1-page" data-split>Request a proposal</h1>
<p class="lede" data-speakable>Tell us about the project. A principal reviews every request, and we reply within two business days. For bid deadlines, call ${SITE.phone}.</p>
<address><strong>${SITE.name}</strong><span>${SITE.street}</span><span>${SITE.city}, ${SITE.regionName} ${SITE.zip}</span><a class="big-tel" href="tel:${SITE.tel}">${SITE.phone}</a>
<a class="link" href="${orgLd.hasMap}" rel="noopener" target="_blank">Open in Google Maps ${arrow}</a></address>
</div>
<form class="form" data-form action="${esc(SITE.formEndpoint)}" method="post" novalidate>
<div class="field"><label for="f-name">Name</label><input id="f-name" name="name" autocomplete="name" required></div>
<div class="field"><label for="f-org">Organization</label><input id="f-org" name="organization" autocomplete="organization" required></div>
<div class="field"><label for="f-email">Email</label><input id="f-email" type="email" name="email" autocomplete="email" required></div>
<div class="field"><label for="f-phone">Phone <span class="opt">(optional)</span></label><input id="f-phone" type="tel" name="phone" autocomplete="tel"></div>
<div class="field field-wide"><label for="f-svc">Service</label><select id="f-svc" name="service"><option value="">Select a service</option>${SERVICES.map((s) => `<option>${esc(s.name)}</option>`).join('')}<option>Not sure yet</option></select></div>
<div class="field field-wide"><label for="f-desc">Project description</label><textarea id="f-desc" name="description" rows="6" placeholder="Location, owner, schedule, and what you need from SGI"></textarea></div>
<input type="text" name="_gotcha" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
<div class="field-wide form-actions"><button class="btn" type="submit">Send request ${arrow}</button><p class="form-msg" role="status" aria-live="polite" data-form-msg></p></div>
</form>
</section>`;
  add('/contact/', page({ path: '/contact/', title: 'Contact and request a proposal', description: `Request a proposal from Salcedo Group, Inc. ${SITE.street}, ${SITE.city}, TX ${SITE.zip}. Call ${SITE.phone}. A principal reviews every request.`, active: 'contact', body, type: 'ContactPage', crumbs }));
}

// 404
const notFound = page({
  path: '/404',
  title: 'Page not found',
  description: 'The page you were looking for has moved or does not exist.',
  body: `<section class="wrap page-head nf">${contours({ seed: 3 })}<span class="tick"></span><h1 class="h1 h1-page">This survey came up empty.</h1><p class="lede">The page you were looking for has moved or does not exist.</p><div class="actions"><a class="btn" href="/">Home ${arrow}</a><a class="btn btn-ghost" href="/projects/">Projects</a></div></section>`,
}).replace('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">', '<meta name="robots" content="noindex">');

// ---------- write ----------
if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });
for (const [path, html] of pages) {
  const dir = join(OUT, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}
writeFileSync(join(OUT, '404.html'), notFound);
cpSync(join(ROOT, 'src'), OUT, { recursive: true });

// sitemap + robots
const prio = (p) => (p === '/' ? '1.0' : p.split('/').length <= 3 ? '0.8' : '0.6');
writeFileSync(
  join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages
  .map(([p]) => {
    const proj = PROJECTS.find((x) => projUrl(x) === p);
    const imgs = proj ? proj.imgs.map((im, k) => `<image:image><image:loc>${U(imgUrl(im))}</image:loc><image:title>${esc(proj.alts[k] || proj.name)}</image:title></image:image>`).join('') : '';
    return `<url><loc>${U(p)}</loc><lastmod>${TODAY}</lastmod><priority>${prio(p)}</priority>${imgs}</url>`;
  })
  .join('\n')}
</urlset>
`
);
writeFileSync(
  join(OUT, 'robots.txt'),
  `# Search engines and AI answer engines are welcome to index this site.
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: ${U('/sitemap.xml')}
`
);

// llms.txt (summary) and llms-full.txt (all facts as Markdown) for answer engines
const llms = `# ${SITE.name}

> ${SITE.description} Office: ${SITE.street}, ${SITE.city}, ${SITE.region} ${SITE.zip}. Phone: ${SITE.phone}.

Key facts:
- Founded ${SITE.founded} by Luis M. Salcedo, PE, RPLS, CFM (Chairman and CEO). President: Michael A. Salcedo, PE, RPLS.
- ${SITE.employees} employees, two in-house survey crews.
- ${SITE.credentials.join('; ')}.
- Prime consultant on Dallas County's $21 million Camp Wisdom Road reconstruction.

## Pages
- [Home](${U('/')}): overview of the firm, services and featured projects
- [Firm](${U('/firm/')}): history, credo, quality process and team
${PEOPLE.map((p) => `- [${p.name}](${U(personUrl(p))}): ${p.role}`).join('\n')}
- [FAQ](${U('/faq/')}): direct answers about SGI
- [Contact](${U('/contact/')}): request a proposal

## Services
${DISCIPLINES.map((d) => `- [${d.name}](${U(`/services/${d.slug}/`)}): ${d.answer}\n${SERVICES.filter((s) => s.discipline === d.slug).map((s) => `  - [${s.name}](${U(svcUrl(s))}): ${s.lede}`).join('\n')}`).join('\n')}

## Projects
${PROJECTS.map((p) => `- [${p.name}](${U(projUrl(p))}): ${p.summary}`).join('\n')}

## Where we work
${PLACES.map((p) => `- [${p.full}](${U(placeUrl(p))}): ${p.lede}`).join('\n')}

## Optional
- [Full content in Markdown](${U('/llms-full.txt')})
`;
writeFileSync(join(OUT, 'llms.txt'), llms);
const full = `# ${SITE.name}: full site content

${SITE.description}

Address: ${SITE.street}, ${SITE.city}, ${SITE.regionName} ${SITE.zip}. Phone: ${SITE.phone}. Website: ${U('/')}

## People
${PEOPLE.map((p) => `### ${fullName(p)}, ${p.role}\n\n${p.summary}\n\n${p.bio.join('\n\n')}\n\nEducation:\n${p.education.map((e) => `- ${e}`).join('\n')}`).join('\n\n')}

Staff: ${STAFF.map((g) => `${g.k}: ${g.v.join(', ')}`).join('. ')}.

## Services
${SERVICES.map((s) => `### ${s.name} (${discOf(s).name})\n\n${s.lede}\n\n${s.what}\n\nApproach:\n${s.how.map(([t, x]) => `- ${t}: ${x}`).join('\n')}\n\n${s.faqs.map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}`).join('\n\n')}

## Projects
${PROJECTS.map((p) => `### ${p.name}\n\n${p.answer}\n\n${p.body.join('\n\n')}\n\n${p.facts.map(([k, v]) => `- ${k}: ${v}`).join('\n')}`).join('\n\n')}

### Land development
${DEV.map((d) => `- ${d.name}, ${d.city}: ${d.scope}`).join('\n')}

## Frequently asked questions
${FAQ.flatMap(([, qs]) => qs).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}
`;
writeFileSync(join(OUT, 'llms-full.txt'), full);

console.log(`Built ${pages.length + 1} pages to dist/ for ${SITE.url}`);
