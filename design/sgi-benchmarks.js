/* SGI benchmarks: small benchmark marks can be dragged around the page.
   Drop one on a button to press it. Hovering a button pins a benchmark to its corner. */
(function () {
  if (window.__sgiBenchmarks) return; window.__sgiBenchmarks = true;
  var MARK = 'img[src*="sgi-mark"]:not([src*="watermark"])';
  var BTN = 'button, [role="button"], a[style*="min-height:52px"], a[style*="min-height:38px"]';
  var css = document.createElement('style');
  css.textContent = 'html,body,*{cursor:url(assets/brand/sgi-cursor.svg) 14 14,auto !important}' +
    'a,a *,button,button *,summary,summary *,label,select,[role="button"],[role="button"] *{cursor:url(assets/brand/sgi-cursor-active.svg) 14 14,pointer !important}' +
    'input:not([type=checkbox]):not([type=radio]),textarea{cursor:text !important}' +
    MARK + '{cursor:grab !important;touch-action:none;-webkit-user-drag:none;user-select:none;pointer-events:auto !important}' +
    MARK + '.sgi-bm-drag{cursor:grabbing !important;z-index:90 !important;filter:drop-shadow(0 6px 10px rgba(19,82,34,.28));transition:none !important}' +
    '.sgi-bm-target{outline:2px solid #F43D2C !important;outline-offset:4px}' +
    '@media (prefers-reduced-motion:reduce){.sgi-bm-pin{transition:none !important}}';
  document.head.appendChild(css);

  var pin = document.createElement('img');
  pin.src = 'assets/brand/sgi-mark.svg'; pin.alt = ''; pin.setAttribute('aria-hidden', 'true'); pin.className = 'sgi-bm-pin';
  pin.style.cssText = 'position:fixed;left:0;top:0;width:20px;height:20px;z-index:80;pointer-events:none;opacity:0;background:#FFFFFF;border-radius:50%;box-shadow:0 0 0 2px #FFFFFF;transform:translate(-40px,-40px) scale(.4);transition:transform .38s cubic-bezier(.2,.8,.2,1),opacity .2s';
  document.body.appendChild(pin);
  var hoverBtn = null;
  function showPin(btn) { var r = btn.getBoundingClientRect(); pin.style.opacity = '1'; pin.style.transform = 'translate(' + (r.left - 10) + 'px,' + (r.top - 10) + 'px) scale(1) rotate(0deg)'; }
  function hidePin() { pin.style.opacity = '0'; pin.style.transform = pin.style.transform.replace(/scale\([^)]*\)/, 'scale(.4)'); }
  document.addEventListener('pointerover', function (e) { if (drag) return; var b = e.target.closest && e.target.closest(BTN); if (b && b !== hoverBtn) { hoverBtn = b; showPin(b); } });
  document.addEventListener('pointerout', function (e) { if (!hoverBtn) return; var to = e.relatedTarget; if (!to || !hoverBtn.contains(to)) { hoverBtn = null; hidePin(); } });
  window.addEventListener('scroll', function () { if (hoverBtn) showPin(hoverBtn); }, { passive: true });

  var drag = null;
  document.addEventListener('dragstart', function (e) { if (e.target.matches && e.target.matches(MARK)) e.preventDefault(); });
  document.addEventListener('pointerdown', function (e) {
    var m = e.target.closest && e.target.closest(MARK); if (!m || e.button !== 0) return;
    if (m.getBoundingClientRect().width > 48) return;
    document.documentElement.style.setProperty('cursor', 'grabbing', 'important');
    e.preventDefault(); e.stopPropagation();
    var base = (m.dataset.bmX ? [+m.dataset.bmX, +m.dataset.bmY] : [0, 0]);
    drag = { m: m, sx: e.clientX, sy: e.clientY, bx: base[0], by: base[1], moved: false, target: null };
    m.classList.add('sgi-bm-drag'); if (m.setPointerCapture) m.setPointerCapture(e.pointerId);
    hidePin();
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    var x = drag.bx + dx, y = drag.by + dy; drag.m.style.translate = x + 'px ' + y + 'px'; drag.m.dataset.bmX = x; drag.m.dataset.bmY = y;
    drag.m.style.visibility = 'hidden'; var under = document.elementFromPoint(e.clientX, e.clientY); drag.m.style.visibility = '';
    var b = under && under.closest && under.closest(BTN);
    if (b !== drag.target) { if (drag.target) drag.target.classList.remove('sgi-bm-target'); drag.target = b || null; if (b) b.classList.add('sgi-bm-target'); }
  });
  function end() {
    if (!drag) return; document.documentElement.style.removeProperty('cursor'); var d = drag; drag = null; d.m.classList.remove('sgi-bm-drag');
    if (d.target) {
      d.target.classList.remove('sgi-bm-target');
      d.m.style.transition = 'translate .45s cubic-bezier(.2,.8,.2,1)'; d.m.style.translate = d.bx + 'px ' + d.by + 'px'; d.m.dataset.bmX = d.bx; d.m.dataset.bmY = d.by;
      setTimeout(function () { d.m.style.transition = ''; }, 480);
      d.target.click();
    }
  }
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest(MARK) && e.target.getBoundingClientRect().width <= 48) { e.preventDefault(); e.stopPropagation(); } }, true);
})();
