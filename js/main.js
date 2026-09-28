import { ABOUT, LINKS } from './data.js';
import { initWork } from './work.js';
import { initLab } from './lab.js';
import { initInput } from './input.js';
import { initAnnotations } from './annotate.js';
import { initHero } from './hero.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function links() {
  return LINKS.map((l) => (l.href
    ? `<li><a href="${esc(l.href)}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a></li>`
    : `<li><span class="pending" title="Link coming">${esc(l.label)}</span></li>`)).join('');
}

function renderAbout() {
  $('[data-about-text]').innerHTML = ABOUT.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('');
  $('[data-about-areas]').innerHTML = ABOUT.areas.map((a) => `<li>${esc(a)}</li>`).join('');
  document.querySelectorAll('[data-links]').forEach((el) => { el.innerHTML = links(); });
}

function nav() {
  const header = $('.site-nav');
  const navLinks = [...document.querySelectorAll('.site-nav [data-section]')];
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      navLinks.forEach((a) => (a.dataset.section === e.target.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main > section[id]').forEach((s) => io.observe(s));
}

renderAbout();
nav();
initWork($('#work'), $('dialog.case'), { reducedMotion });
initLab($('#lab'));
initInput($('#input'), { reducedMotion });
initAnnotations();

// The hero is the heaviest thing on the page: start it after the first paint.
requestAnimationFrame(() => setTimeout(() => {
  initHero($('.hero'), { reducedMotion }).catch((err) => console.error('[hero]', err));
}, 0));
