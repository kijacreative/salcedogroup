/* Salcedo Group v2: interactions and motion.
   Motion follows Open Design's emilkowalski-motion + gsap-scrolltrigger guidance:
   transform/opacity only, one easing family, reduced-motion fallbacks, content visible without JS. */
(() => {
  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGsap && !reduce && root.classList.contains('motion');
  if (!motion) root.classList.remove('motion');
  window.__sgiMotion = motion;

  /* ---------- header: menu, scrolled state, hide on scroll down, progress ---------- */
  const header = $('[data-header]');
  const menuBtn = $('[data-menu]');
  const nav = $('#nav');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    if (open) header.classList.remove('is-hidden');
  };
  menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav?.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });
  nav?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });

  const progress = $('[data-progress]');
  let lastY = scrollY;
  let ticking = false;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    if (!nav.classList.contains('is-open') && !d.activeElement?.closest?.('[data-header]')) {
      header.classList.toggle('is-hidden', y > 360 && y > lastY + 2);
      if (y < lastY - 2) header.classList.remove('is-hidden');
    }
    const max = d.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    lastY = y;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- hero slideshow ---------- */
  const stage = $('[data-slides]');
  if (stage) {
    const slides = $$('.slide', stage);
    const dots = $$('.slide-dots button', stage);
    let i = 0;
    let timer = null;
    const show = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => {
        const on = k === i;
        s.classList.toggle('is-on', on);
        s.setAttribute('aria-hidden', String(!on));
        const a = $('a', s);
        if (a) a.tabIndex = on ? 0 : -1;
      });
      dots.forEach((b, k) => {
        b.removeAttribute('aria-current');
        if (k === i) { void b.offsetWidth; b.setAttribute('aria-current', 'true'); }
      });
    };
    const play = () => { if (reduce) return; clearInterval(timer); timer = setInterval(() => show(i + 1), 6000); stage.classList.remove('is-paused'); };
    const pause = () => { clearInterval(timer); stage.classList.add('is-paused'); };
    dots.forEach((b, k) => b.addEventListener('click', () => { show(k); play(); }));
    stage.addEventListener('mouseenter', pause);
    stage.addEventListener('mouseleave', play);
    stage.addEventListener('focusin', pause);
    stage.addEventListener('focusout', play);
    d.addEventListener('visibilitychange', () => (d.hidden ? pause() : play()));
    if (reduce) stage.classList.add('is-paused');
    play();
  }

  /* ---------- project gallery ---------- */
  const gallery = $('[data-gallery]');
  if (gallery) {
    const slides = $$('.g-slide', gallery);
    const thumbs = $$('.g-thumbs button', gallery);
    const count = $('[data-g-count]', gallery);
    let i = 0;
    const show = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.setAttribute('aria-hidden', String(k !== i)); });
      thumbs.forEach((t, k) => (k === i ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current')));
      if (count) count.textContent = `${i + 1} / ${slides.length}`;
    };
    thumbs.forEach((t, k) => t.addEventListener('click', () => show(k)));
    $('[data-g="prev"]', gallery)?.addEventListener('click', () => show(i - 1));
    $('[data-g="next"]', gallery)?.addEventListener('click', () => show(i + 1));
    gallery.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { show(i - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { show(i + 1); e.preventDefault(); }
    });
    let x0 = null;
    const main = $('.g-main', gallery);
    main.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    main.addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 40) show(i + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  }

  /* ---------- project filters ---------- */
  const filterWrap = $('[data-filters]');
  const grid = $('[data-filter-grid]');
  if (filterWrap && grid) {
    const cards = $$('.pcard', grid);
    const status = $('[data-filter-status]');
    const apply = (f, animate = true) => {
      $$('button', filterWrap).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
      const keep = cards.filter((c) => f === 'All' || c.dataset.type === f);
      const drop = cards.filter((c) => !keep.includes(c));
      const reveal = () => {
        drop.forEach((c) => c.classList.add('is-out'));
        keep.forEach((c) => c.classList.remove('is-out'));
        if (motion && animate) {
          gsap.fromTo(keep, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.05, overwrite: true });
          ScrollTrigger.refresh();
        } else keep.forEach((c) => { c.style.opacity = 1; c.style.transform = 'none'; });
      };
      reveal();
      if (status) status.textContent = `Showing ${keep.length} ${f === 'All' ? '' : f.toLowerCase() + ' '}project${keep.length === 1 ? '' : 's'}`;
      const url = new URL(location.href);
      f === 'All' ? url.searchParams.delete('type') : url.searchParams.set('type', f);
      history.replaceState(null, '', url);
    };
    filterWrap.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) apply(b.dataset.f); });
    const initial = new URLSearchParams(location.search).get('type');
    if (initial && $$('button', filterWrap).some((b) => b.dataset.f === initial)) apply(initial, false);
  }

  /* ---------- details open/close animation ---------- */
  $$('details.qa').forEach((det) => {
    const sum = $('summary', det);
    const body = $('.qa-a', det);
    sum.addEventListener('click', (e) => {
      if (reduce) return;
      e.preventDefault();
      if (det.dataset.anim) return;
      det.dataset.anim = '1';
      if (!det.open) {
        det.open = true;
        const h = body.scrollHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => delete det.dataset.anim;
      } else {
        const h = body.scrollHeight;
        body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 200, easing: 'cubic-bezier(.4,0,.6,1)' }).onfinish = () => { det.open = false; delete det.dataset.anim; };
      }
    });
  });

  /* ---------- FAQ search + topics ---------- */
  const search = $('[data-faq-search]');
  const cats = $('[data-faq-cats]');
  if (search && cats) {
    const items = $$('.faq-page .qa');
    const groups = $$('.faq-group');
    const empty = $('[data-faq-empty]');
    const status = $('[data-faq-status]');
    const orig = new Map(items.map((q) => [q, { h: $('h3', q).textContent, a: $('.qa-a p', q).textContent }]));
    let cat = 'All';
    const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mark = (el, text, term) => {
      el.textContent = '';
      if (!term) { el.textContent = text; return; }
      const re = new RegExp(`(${escRe(term)})`, 'ig');
      text.split(re).forEach((part) => {
        if (part.toLowerCase() === term.toLowerCase()) { const m = d.createElement('mark'); m.textContent = part; el.append(m); }
        else el.append(part);
      });
    };
    const run = () => {
      const term = search.value.trim();
      const t = term.toLowerCase();
      let shown = 0;
      items.forEach((q) => {
        const o = orig.get(q);
        const ok = (cat === 'All' || q.dataset.cat === cat) && (!t || (o.h + ' ' + o.a).toLowerCase().includes(t));
        q.hidden = !ok;
        if (ok) { shown++; q.style.opacity = 1; q.style.transform = 'none'; }
        mark($('h3', q), o.h, term);
        mark($('.qa-a p', q), o.a, term);
        if (t && ok && o.a.toLowerCase().includes(t) && !o.h.toLowerCase().includes(t)) q.open = true;
      });
      groups.forEach((g) => (g.hidden = !$$('.qa', g).some((q) => !q.hidden)));
      empty.hidden = shown > 0;
      status.textContent = `${shown} question${shown === 1 ? '' : 's'} shown`;
    };
    search.addEventListener('input', run);
    cats.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      cat = b.dataset.f;
      $$('button', cats).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      run();
    });
  }

  /* ---------- contact form ---------- */
  const form = $('[data-form]');
  if (form) {
    const msg = $('[data-form-msg]', form);
    const fieldErr = (el, text) => {
      el.setAttribute('aria-invalid', text ? 'true' : 'false');
      let e = el.parentElement.querySelector('.err');
      if (text && !e) { e = d.createElement('span'); e.className = 'err'; e.id = el.id + '-err'; el.parentElement.append(e); el.setAttribute('aria-describedby', e.id); }
      if (e) e.textContent = text || '';
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let first = null;
      $$('input[required], input[type=email]', form).forEach((el) => {
        let t = '';
        if (el.required && !el.value.trim()) t = 'Required.';
        else if (el.type === 'email' && el.value && !el.checkValidity()) t = 'Enter a valid email address.';
        fieldErr(el, t);
        if (t && !first) first = el;
      });
      if (first) { first.focus(); msg.className = 'form-msg bad'; msg.textContent = 'Please complete the highlighted fields.'; return; }
      if (form.elements._gotcha.value) return;
      const endpoint = form.getAttribute('action');
      const btn = $('button[type=submit]', form);
      if (!endpoint) {
        msg.className = 'form-msg bad';
        msg.textContent = 'Online requests are not connected yet. Please call (214) 412-3122.';
        return;
      }
      btn.disabled = true;
      msg.className = 'form-msg';
      msg.textContent = 'Sending…';
      try {
        const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        form.classList.add('is-sent');
        msg.className = 'form-msg ok';
        msg.textContent = 'Request received. A principal will reply within two business days.';
      } catch {
        msg.className = 'form-msg bad';
        msg.textContent = 'The request did not send. Please try again or call (214) 412-3122.';
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---------- motion ---------- */
  if (!motion) return;
  gsap.registerPlugin(ScrollTrigger);
  const EASE = 'power3.out';

  // Pinned sections are created first so later triggers account for pin spacing.
  // How-we-work: pinned horizontal scroll on wide screens, stacked reveal on small ones.
  const proc = $('[data-process]');
  if (proc) {
    const track = $('[data-track]', proc);
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      proc.classList.add('is-horizontal');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tw = gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: { trigger: proc, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      $$('.step', track).forEach((s) => gsap.from(s, { opacity: 0.35, scale: 0.96, ease: 'none', scrollTrigger: { trigger: s, containerAnimation: tw, start: 'left 85%', end: 'left 45%', scrub: true } }));
      return () => proc.classList.remove('is-horizontal');
    });
    mm.add('(max-width: 900px)', () => {
      gsap.from($$('.step', track), { opacity: 0, y: 30, duration: 0.7, ease: EASE, stagger: 0.1, scrollTrigger: { trigger: track, start: 'top 85%', once: true } });
    });
  }


  // Split headings into masked words.
  $$('[data-split]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true"><span>${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span></span>`).join(' ');
    el.classList.add('is-split');
    const inner = $$('.w > span', el);
    const inHero = el.closest('.hero, .page-head, .contact');
    gsap.from(inner, {
      yPercent: 110,
      duration: inHero ? 0.9 : 0.8,
      ease: 'power4.out',
      stagger: Math.min(0.06, 0.5 / words.length),
      delay: inHero ? 0.1 : 0,
      scrollTrigger: inHero ? undefined : { trigger: el, start: 'top 85%', once: true },
    });
  });

  gsap.to('[data-hero-fade]', { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.12, delay: 0.45 });
  const hs = $('.hero-stage');
  if (hs) gsap.from(hs, { clipPath: 'inset(8% 8% 8% 8% round 4px)', opacity: 0, duration: 1.2, ease: 'power3.inOut', delay: 0.15 });

  $$('.tick').forEach((t) => gsap.from(t, { scaleX: 0, duration: 0.8, ease: EASE, delay: 0.1, scrollTrigger: { trigger: t, start: 'top 92%', once: true } }));

  // Contour lines draw themselves, survey-style.
  $$('.contours').forEach((svg) => {
    const paths = $$('path', svg);
    paths.forEach((p) => p.style.setProperty('--len', Math.ceil(p.getTotalLength())));
    gsap.to(paths, {
      strokeDashoffset: 0,
      duration: 2.4,
      ease: 'power2.inOut',
      stagger: { each: 0.08, from: 'start' },
      scrollTrigger: { trigger: svg.parentElement, start: 'top 80%', once: true },
    });
    gsap.to(svg, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: svg.parentElement, start: 'top top', end: 'bottom top', scrub: true } });
  });

  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.08, overwrite: true }),
  });

  $$('[data-count]').forEach((el) => {
    const to = +el.dataset.count;
    const from = +(el.dataset.from || 0);
    const pre = el.dataset.prefix || '';
    const suf = el.dataset.suffix || '';
    const o = { v: from };
    const paint = () => (el.textContent = pre + Math.round(o.v) + suf);
    gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 95%', once: true }, onStart: paint, onUpdate: paint });
  });

  $$('[data-parallax] img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
