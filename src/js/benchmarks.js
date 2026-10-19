/* SGI benchmarks (from the v3 design): the small SGi marks on the page can be picked up and dragged.
   Drop one on a button to press it; hovering a button pins a benchmark to its corner.
   Fine pointers only, and the pin respects reduced motion via CSS. */
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const d = document;
  d.documentElement.classList.add('bm-on');
  const MARK = 'img.bm';
  const BTN = 'button, [role="button"], .btn';
  const pin = d.createElement('img');
  pin.src = '/brand/sgi-mark.svg'; pin.alt = ''; pin.setAttribute('aria-hidden', 'true'); pin.className = 'bm-pin';
  d.body.appendChild(pin);
  let hoverBtn = null;
  let drag = null;
  const showPin = (b) => { const r = b.getBoundingClientRect(); pin.style.opacity = '1'; pin.style.transform = `translate(${r.left - 10}px, ${r.top - 10}px) scale(1)`; };
  const hidePin = () => { pin.style.opacity = '0'; pin.style.transform = pin.style.transform.replace(/scale\([^)]*\)/, 'scale(.4)'); };
  d.addEventListener('pointerover', (e) => { if (drag) return; const b = e.target.closest?.(BTN); if (b && b !== hoverBtn) { hoverBtn = b; showPin(b); } });
  d.addEventListener('pointerout', (e) => { if (hoverBtn && !hoverBtn.contains(e.relatedTarget)) { hoverBtn = null; hidePin(); } });
  addEventListener('scroll', () => { if (hoverBtn) showPin(hoverBtn); }, { passive: true });

  d.addEventListener('dragstart', (e) => { if (e.target.matches?.(MARK)) e.preventDefault(); });
  d.addEventListener('pointerdown', (e) => {
    const m = e.target.closest?.(MARK);
    if (!m || e.button !== 0 || m.getBoundingClientRect().width > 48) return;
    e.preventDefault();
    const bx = +(m.dataset.bmX || 0), by = +(m.dataset.bmY || 0);
    drag = { m, sx: e.clientX, sy: e.clientY, bx, by, target: null };
    m.classList.add('is-drag');
    m.setPointerCapture?.(e.pointerId);
    hidePin();
  }, true);
  d.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const x = drag.bx + e.clientX - drag.sx, y = drag.by + e.clientY - drag.sy;
    drag.m.style.translate = `${x}px ${y}px`; drag.m.dataset.bmX = x; drag.m.dataset.bmY = y;
    drag.m.style.visibility = 'hidden';
    const under = d.elementFromPoint(e.clientX, e.clientY);
    drag.m.style.visibility = '';
    const b = under?.closest?.(BTN) || null;
    if (b !== drag.target) { drag.target?.classList.remove('bm-target'); drag.target = b; b?.classList.add('bm-target'); }
  });
  const end = () => {
    if (!drag) return;
    const g = drag; drag = null;
    g.m.classList.remove('is-drag');
    if (g.target) {
      g.target.classList.remove('bm-target');
      g.m.style.transition = 'translate .45s cubic-bezier(.2,.8,.2,1)';
      g.m.style.translate = `${g.bx}px ${g.by}px`; g.m.dataset.bmX = g.bx; g.m.dataset.bmY = g.by;
      setTimeout(() => (g.m.style.transition = ''), 480);
      g.target.click();
    }
  };
  d.addEventListener('pointerup', end);
  d.addEventListener('pointercancel', end);
})();
