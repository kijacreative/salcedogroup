/* SGI v3 shared scroll motion. Requires gsap + ScrollTrigger on window. */
(function () {
  function setup(R) {
    var g = window.gsap, ST = window.ScrollTrigger;
    if (!g || !ST || !R || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return function () {};
    g.registerPlugin(ST);
    var q = function (s) { return Array.prototype.slice.call(R.querySelectorAll(s)); }, one = function (s) { return R.querySelector(s); };
    q('[data-motion="rise"]').forEach(function (el) { g.from(el, { y: 34, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }); });
    q('[data-motion="frame"]').forEach(function (el) { g.from(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } }); });
    q('[data-motion="measure"]').forEach(function (el) { g.from(el, { scaleX: 0, transformOrigin: '0 50%', duration: 1, ease: 'power3.inOut', scrollTrigger: { trigger: el, start: 'top 85%', once: true } }); });
    q('[data-motion="measure-v"]').forEach(function (el) { g.from(el, { scaleY: 0, transformOrigin: '50% 0', duration: 1, ease: 'power3.inOut', scrollTrigger: { trigger: el, start: 'top 85%', once: true } }); });
    // opening: the plat comes apart into the photograph
    var first = one('[data-scene="first"]'), ground = one('[data-scene="ground"]'), wall = one('[data-scene="wall"]'), room = one('[data-scene="room"] img');
    if (first && ground && wall) {
      var wipes = q('[data-hero-wipe]'), fade = Array.prototype.slice.call(wall.children), proxy = { p: 0 }, r = null;
      var measure = function () { var f = first.getBoundingClientRect(), w = wall.getBoundingClientRect(); r = { l: w.left - f.left, t: w.top - f.top, r: w.right - f.left, b: w.bottom - f.top, W: f.width, H: f.height }; };
      var tiles = Array.prototype.slice.call(wall.querySelectorAll('[data-tile] img')), cl = function (v) { return Math.max(0, Math.min(1, v)); }, ease = function (v) { return v < .5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2; };
      var paint = function () { if (!r) measure(); var raw = proxy.p, n = tiles.length;
        tiles.forEach(function (im, k) { var s0 = .02 + (n > 1 ? k / (n - 1) : 0) * .22; im.style.opacity = 1 - cl((raw - s0) / .12); });
        var p = n ? ease(cl((raw - .34) / .66)) : raw, L = r.l * (1 - p), T = r.t * (1 - p), Rt = r.r + (r.W - r.r) * p, B = r.b + (r.H - r.b) * p;
        ground.style.clipPath = 'polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ' + L + 'px ' + T + 'px, ' + Rt + 'px ' + T + 'px, ' + Rt + 'px ' + B + 'px, ' + L + 'px ' + B + 'px, ' + L + 'px ' + T + 'px)';
        var o = n ? 1 - cl((raw - .4) / .3) : Math.max(0, 1 - p * 2.2); fade.forEach(function (el) { el.style.opacity = o; }); var wp = cl(raw / .3); wipes.forEach(function (el) { el.style.clipPath = 'inset(0 ' + (wp * 100) + '% 0 0)'; el.style.opacity = 1 - cl((raw - .18) / .12); el.style.pointerEvents = wp > .5 ? 'none' : ''; }); if (room) room.style.transform = 'scale(' + (1.1 - .1 * p) + ')'; };
      g.to(proxy, { p: 1, ease: 'none', onUpdate: paint, scrollTrigger: { trigger: first, start: 'top top', end: 'bottom 35%', scrub: true, onRefresh: function () { measure(); paint(); } } });
      measure(); paint();
    }
    // services: sticky frame follows the list
    var imgs = q('[data-scene="frame"] img'), svcs = q('[data-svc]');
    if (imgs.length && svcs.length) {
      var show = function (i) { imgs.forEach(function (im, k) { im.style.opacity = k === i ? 1 : 0; }); };
      show(0);
      svcs.forEach(function (li, i) { ST.create({ trigger: li, start: 'top 60%', end: 'bottom 60%', onToggle: function (self) { if (self.isActive && imgs[i]) { show(i); g.fromTo(imgs[i], { scale: 1.06 }, { scale: 1, duration: .9, ease: 'power2.out', overwrite: true }); } } }); });
    }
    var sheet = one('[data-scene="sheet"]');
    if (sheet) g.from(sheet.children, { y: 72, opacity: 0, duration: .8, ease: 'power3.out', stagger: { each: .05, from: 'random' }, scrollTrigger: { trigger: sheet, start: 'top 78%', once: true } });
    var strips = one('[data-scene="strips"]');
    if (strips) g.from(strips.children, { x: function (i) { return (i - 2) * 56; }, opacity: 0, duration: .9, ease: 'power3.out', stagger: .04, scrollTrigger: { trigger: strips, start: 'top 80%', once: true } });
    var steps = one('[data-scene="steps"]');
    if (steps) g.from(steps.children, { y: 56, opacity: 0, duration: .8, ease: 'power3.out', stagger: .08, scrollTrigger: { trigger: steps, start: 'top 78%', once: true } });
    var word = one('[data-promise-word]'), copies = q('[data-promise-copy]'), ptype = one('[data-scene="promise"]');
    if (word && ptype) {
      g.fromTo(word, { scaleX: 1.4, opacity: .15 }, { scaleX: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: ptype, start: 'top 90%', end: 'top 30%', scrub: true } });
      copies.forEach(function (c, i) { g.fromTo(c, { y: 0, opacity: 0 }, { y: (i + 1) * -7 + '%', opacity: .32 - i * .09, ease: 'none', scrollTrigger: { trigger: ptype, start: 'top 90%', end: 'top 30%', scrub: true } }); });
    }
    var cards = q('[data-card]');
    cards.forEach(function (c, i) { if (i > 0) g.to(cards[i - 1], { scale: .96, ease: 'none', scrollTrigger: { trigger: c, start: 'top 80%', end: 'top 24%', scrub: true } }); });
    var form = one('[data-scene="form"]'), paper = one('[data-scene="paper"]');
    if (form && paper) g.from(paper, { scaleY: 0, transformOrigin: '50% 0', duration: 1, ease: 'power3.out', scrollTrigger: { trigger: form, start: 'top 82%', once: true } });
    return function () { ST.getAll().forEach(function (t) { t.kill(); }); };
  }
  window.SGIv3Motion = { setup: setup };
})();
