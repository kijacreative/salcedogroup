/* Salcedo Group, Inc. — behavior for the pre-rendered pages:
   header hide-on-scroll, the Index overlay, the contact form and the design's scroll motion. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* Header: hide on scroll down, return on scroll up */
  var bar = $('[data-header]'), lastY = window.scrollY;
  if (bar) window.addEventListener('scroll', function () {
    var y = window.scrollY;
    bar.classList.toggle('is-hidden', y > 200 && y > lastY && !document.documentElement.classList.contains('ix-open'));
    lastY = y;
  }, { passive: true });

  /* Index overlay */
  var ix = $('#site-index'), openBtn = $('[data-index-open]'), closeBtn = $('[data-index-close]');
  function setOpen(open) {
    if (!ix) return;
    ix.hidden = !open;
    document.documentElement.classList.toggle('ix-open', open);
    if (openBtn) openBtn.setAttribute('aria-expanded', String(open));
    if (open) closeBtn.focus(); else if (openBtn && openBtn.offsetParent) openBtn.focus();
  }
  if (ix && openBtn) {
    openBtn.addEventListener('click', function () { setOpen(true); });
    closeBtn.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (ix.hidden) return;
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab') {
        var f = ix.querySelectorAll('a, button'), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia('(min-width: 960px)').addEventListener('change', function (m) { if (m.matches && !ix.hidden) setOpen(false); });
  }

  /* Contact form: posts to the endpoint set at build time (FORM_ENDPOINT) */
  var form = $('[data-form]');
  if (form) {
    var sent = $('[data-form-sent]'), btn = $('button[type=submit]', form);
    var msg = document.createElement('p');
    msg.className = 'form-msg'; msg.setAttribute('role', 'alert');
    btn.parentNode.insertBefore(msg, btn.nextSibling);
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (el) {
        var ok = el.checkValidity();
        el.setAttribute('aria-invalid', String(!ok));
        if (!ok && !bad) bad = el;
      });
      if (bad) { bad.focus(); msg.textContent = 'Please complete the highlighted fields.'; return; }
      var endpoint = form.getAttribute('action');
      if (!endpoint) { msg.textContent = 'Online requests are not connected yet. Please call (214) 412-3122.'; return; }
      msg.textContent = ''; btn.disabled = true;
      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          form.hidden = true; if (sent) { sent.hidden = false; sent.focus && sent.setAttribute('tabindex', '-1'); sent.focus(); }
        })
        .catch(function () { msg.textContent = 'Something went wrong sending your request. Please call (214) 412-3122.'; })
        .then(function () { btn.disabled = false; });
    });
  }

  /* Scroll motion from the design (sgi-v3-motion.js + GSAP, loaded with defer) */
  window.addEventListener('DOMContentLoaded', function () {
    if (window.gsap && window.ScrollTrigger && window.SGIv3Motion) window.SGIv3Motion.setup(document.getElementById('top'));
  });
})();
