// Handwritten notes: <span class="note" data-arrow="left|right|up|down|up-right|down-left">text</span>
// Each note gets a small tilt and a hand-drawn arrow that is inked when it scrolls into view.
// Two notes never get the same wobble, because the wobble is seeded from the text.

import { rng } from './noise.js';

const ROT = { right: 0, 'down-right': 40, down: 90, 'down-left': 140, left: 180, 'up-left': 220, up: 270, 'up-right': 320 };

function arrowSVG(dir, r) {
  const w = (v) => (v + (r() - 0.5) * 2.2).toFixed(1);
  // a loose stroke drifting right, then a two-stroke head
  const body = `M${w(4)} ${w(20)} C ${w(16)} ${w(12)}, ${w(30)} ${w(24)}, ${w(46)} ${w(15)}`;
  const head = `M${w(38)} ${w(9)} L ${w(47)} ${w(15)} L ${w(39)} ${w(22)}`;
  // plain "left" is mirrored rather than rotated so it doesn't end up upside down
  const t = dir === 'left' ? 'translate(50 0) scale(-1 1)' : `rotate(${ROT[dir] ?? 0} 25 16)`;
  return `<svg viewBox="0 0 50 32" aria-hidden="true" focusable="false"><g transform="${t}"><path d="${body}"/><path d="${head}"/></g></svg>`;
}

const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-drawn'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -4% 0px' })
  : null;

function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

function scan(root) {
  root.querySelectorAll('.note:not([data-ready])').forEach((el) => {
    el.dataset.ready = '1';
    const r = rng(hash(el.textContent));
    el.style.setProperty('--tilt', `${((r() - 0.5) * 5).toFixed(2)}deg`);
    const dir = el.dataset.arrow;
    if (dir) {
      const pointsBack = dir.includes('left') || dir === 'up' || dir === 'down';
      el.insertAdjacentHTML(pointsBack ? 'afterbegin' : 'beforeend', arrowSVG(dir, r));
      el.querySelectorAll('path').forEach((p) => {
        const len = Math.ceil(p.getTotalLength?.() || 60) + 2;
        p.style.setProperty('--len', len);
      });
    }
    io ? io.observe(el) : el.classList.add('is-drawn');
  });
}

export function initAnnotations() {
  scan(document);
  document.addEventListener('annotations:scan', (e) => scan(e.detail || document));
}
