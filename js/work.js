import { PROJECTS, TAGS } from './data.js';
import { drawPlaceholder, lazyDraw, jitterMesh } from './drawings.js';
import { rng, PALETTE } from './noise.js';

// Slots are handed out in order to whatever is currently visible, so the composition
// re-forms after filtering instead of leaving holes. col = desktop 12-column placement.
const PATTERN = [
  { col: '1 / span 7', ratio: '16 / 10', size: 'L', shift: 0 },
  { col: '9 / span 4', ratio: '4 / 5', size: 'S', shift: 7 },
  { col: '2 / span 5', ratio: '4 / 3', size: 'M', shift: 0 },
  { col: '8 / span 5', ratio: '4 / 3', size: 'M', shift: 4 },
  { col: '1 / span 4', ratio: '1 / 1', size: 'S', shift: 0 },
  { col: '5 / span 4', ratio: '1 / 1', size: 'S', shift: 5 },
  { col: '9 / span 4', ratio: '1 / 1', size: 'S', shift: 0 },
  { col: '1 / span 4', ratio: '4 / 5', size: 'S', shift: 3 },
  { col: '6 / span 7', ratio: '16 / 10', size: 'L', shift: 0 },
  { col: '3 / span 6', ratio: '3 / 2', size: 'M', shift: 0 },
];

const TAG_HEX = { PROTOTYPE: PALETTE.orange, PRODUCT: PALETTE.ink, AI: PALETTE.lime, SPATIAL: PALETTE.cyan, COMMUNITY: PALETTE.red };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const accentFor = (p) => TAG_HEX[p.tags.find((t) => t !== 'PRODUCT') || p.tags[0]] || PALETTE.ink;
const seedFor = (slug) => [...slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function tagList(tags) {
  return `<ul class="tags" aria-label="Tags">${tags
    .map((t) => `<li class="tag" style="--tag:${TAGS[t].color}">${esc(TAGS[t].label)}</li>`)
    .join('')}</ul>`;
}

function mediaHTML(p, { eager = false } = {}) {
  const m = p.media;
  if (!m) return `<canvas class="media ph" data-ph="${p.placeholder}" role="img" aria-label="No image yet for ${esc(p.title)}: placeholder drawing"></canvas>`;
  if (m.type === 'video') {
    return `<video class="media" muted loop playsinline preload="none" data-src="${esc(m.src)}" ${m.poster ? `poster="${esc(m.poster)}"` : ''} aria-label="${esc(m.alt || p.title)}"></video>`;
  }
  return `<img class="media" src="${esc(m.src)}" alt="${esc(m.alt || '')}" ${eager ? '' : 'loading="lazy"'} decoding="async">`;
}

function tileHTML(p, i) {
  return `
  <article class="tile" data-slug="${p.slug}" data-tags="${p.tags.join(' ')}">
    <div class="tile-media">
      ${mediaHTML(p)}
      <svg class="tile-wire" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
      <span class="tile-view mono" aria-hidden="true"><b>OUTPUT</b> → <b>VIEWPORT</b></span>
      <dl class="tile-diag mono" aria-hidden="true">
        <div><dt>TOOLS</dt><dd>${p.tools.length ? esc(p.tools.join(' / ')) : '<span class="tbd">‹TBD›</span>'}</dd></div>
        <div><dt>MEDIA</dt><dd data-media-info>${p.media ? esc(p.media.type.toUpperCase()) : 'NONE'}</dd></div>
      </dl>
      ${p.media ? '' : `<span class="tile-missing mono" aria-hidden="true">NO MEDIA · assets/work/${p.slug}.jpg</span>`}
    </div>
    <div class="tile-cap">
      <span class="tile-idx mono">${pad(i + 1)}</span>
      <h3 class="tile-title"><a href="#work/${p.slug}" data-open>${esc(p.title)}</a></h3>
      <p>${esc(p.summary)}</p>
      ${tagList(p.tags)}
    </div>
  </article>`;
}

function wireframe(svg, seed) {
  if (svg.childElementCount) return;
  const tris = jitterMesh(100, 100, rng(seed), 11, 0.42);
  const d = tris.map((t) => `M${t[0][0].toFixed(1)} ${t[0][1].toFixed(1)}L${t[1][0].toFixed(1)} ${t[1][1].toFixed(1)}L${t[2][0].toFixed(1)} ${t[2][1].toFixed(1)}Z`).join('');
  svg.innerHTML = `<path d="${d}" vector-effect="non-scaling-stroke"/>`;
}

function hydrateMedia(root, p, reducedMotion) {
  const el = root.querySelector('.media');
  if (!el) return;
  if (el.tagName === 'CANVAS') {
    lazyDraw(el, () => drawPlaceholder(el, el.dataset.ph, seedFor(p.slug), accentFor(p)));
  } else if (el.tagName === 'IMG') {
    const info = root.querySelector('[data-media-info]');
    const done = () => info && el.naturalWidth && (info.textContent = `IMG ${el.naturalWidth}×${el.naturalHeight}`);
    el.complete ? done() : el.addEventListener('load', done, { once: true });
  } else if (el.tagName === 'VIDEO') {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!el.src) el.src = el.dataset.src;
        if (!reducedMotion.matches) el.play().catch(() => {});
      } else el.pause();
    }, { rootMargin: '200px' }).observe(el);
  }
}

export function initWork(section, dialog, { reducedMotion }) {
  const grid = section.querySelector('.work-grid');
  const filterBar = section.querySelector('.filters');
  const countEl = section.querySelector('[data-work-count]');

  grid.innerHTML = PROJECTS.map(tileHTML).join('');
  const tiles = [...grid.querySelectorAll('.tile')];
  tiles.forEach((tile, i) => {
    const p = PROJECTS[i];
    hydrateMedia(tile, p, reducedMotion);
    const svg = tile.querySelector('.tile-wire');
    const arm = () => wireframe(svg, seedFor(p.slug));
    tile.addEventListener('pointerenter', arm);
    tile.addEventListener('focusin', arm);
  });

  // ---------- filters ----------
  const used = Object.keys(TAGS).filter((t) => PROJECTS.some((p) => p.tags.includes(t)));
  const counts = Object.fromEntries(used.map((t) => [t, PROJECTS.filter((p) => p.tags.includes(t)).length]));
  filterBar.innerHTML =
    `<button type="button" class="filter" data-filter="ALL" aria-pressed="true">All<sup>${PROJECTS.length}</sup></button>` +
    used.map((t) => `<button type="button" class="filter" data-filter="${t}" aria-pressed="false" style="--tag:${TAGS[t].color}">${esc(TAGS[t].label)}<sup>${counts[t]}</sup></button>`).join('');
  const active = new Set();

  function layout(animate) {
    let k = 0;
    for (const tile of tiles) {
      const show = active.size === 0 || tile.dataset.tags.split(' ').some((t) => active.has(t));
      tile.hidden = !show;
      if (!show) continue;
      const slot = PATTERN[k++ % PATTERN.length];
      tile.style.setProperty('--col', slot.col);
      tile.style.setProperty('--ratio', slot.ratio);
      tile.style.setProperty('--shift', slot.shift);
      tile.dataset.size = slot.size;
      if (animate && !reducedMotion.matches) {
        wireframe(tile.querySelector('.tile-wire'), seedFor(tile.dataset.slug));
        tile.classList.remove('is-recomputing');
        void tile.offsetWidth;
        tile.classList.add('is-recomputing');
      }
    }
    countEl.textContent = `SHOWING ${pad(k)} / ${pad(tiles.length)}`;
    for (const b of filterBar.querySelectorAll('.filter')) {
      const f = b.dataset.filter;
      b.setAttribute('aria-pressed', String(f === 'ALL' ? active.size === 0 : active.has(f)));
    }
  }
  filterBar.addEventListener('click', (e) => {
    const b = e.target.closest('.filter');
    if (!b) return;
    const f = b.dataset.filter;
    if (f === 'ALL') active.clear();
    else if (active.has(f)) active.delete(f);
    else active.add(f);
    layout(true);
  });
  grid.addEventListener('animationend', (e) => e.target.classList?.remove('is-recomputing'));
  layout(false);

  initCase(dialog, grid, reducedMotion);
}

// ---------- case file ----------
function section(label, text) {
  return `<section class="case-sec"><h3 class="mono">${label}</h3>${
    text ? `<p>${esc(text)}</p>` : `<p class="tbd">Not written yet.</p>`
  }</section>`;
}

function caseHTML(p, i) {
  const prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  const meta = [
    ['YEAR', p.year],
    ['ROLE', p.role],
    ['TOOLS', p.tools.length ? p.tools.join(' / ') : null],
    ['TAGS', p.tags.map((t) => TAGS[t].label.toUpperCase()).join(' / ')],
  ];
  const gallery = p.gallery.length
    ? `<section class="case-gallery"><h3 class="mono">SAMPLES</h3>${p.gallery
        .map((g, k) => `<figure class="sample">
            <img src="${esc(g.src)}" alt="${esc(g.alt || '')}" loading="lazy" decoding="async">
            <figcaption class="mono">${[`SAMPLE_${pad(k + 1)}`, ...(g.meta || [])].map(esc).join('<br>')}</figcaption>
            ${g.note ? `<span class="note" data-arrow="left">${esc(g.note)}</span>` : ''}
          </figure>`)
        .join('')}</section>`
    : '';
  return `
    <header class="case-head mono">
      <span>CASE_${pad(i + 1)} / ${pad(PROJECTS.length)}</span>
      <button type="button" class="case-close" data-close>Close <span aria-hidden="true">✕</span></button>
    </header>
    <h2 class="case-title" id="case-title" tabindex="-1">${esc(p.title)}</h2>
    <p class="case-summary">${esc(p.summary)}</p>
    <figure class="case-hero" style="--ratio: 16 / 9">
      ${mediaHTML(p, { eager: true })}
      ${p.media ? '' : `<figcaption class="tile-missing mono">NO MEDIA · assets/work/${p.slug}.jpg</figcaption>`}
    </figure>
    <dl class="case-meta mono">${meta
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v ? esc(v) : '<span class="tbd">—</span>'}</dd></div>`)
      .join('')}</dl>
    <div class="case-body">
      ${section('WHY', p.why)}
      ${section('PROCESS', p.process)}
      ${section('OUTPUT', p.output)}
      ${section('WHAT BROKE', p.broke)}
    </div>
    ${gallery}
    ${p.notes ? `<section class="case-sec"><h3 class="mono">NOTES</h3><p>${esc(p.notes)}</p></section>` : ''}
    ${p.links.length ? `<ul class="case-links">${p.links.map((l) => `<li><a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></li>`).join('')}</ul>` : ''}
    <nav class="case-nav mono" aria-label="Other projects">
      <a href="#work/${prev.slug}" data-swap>← ${esc(prev.title)}</a>
      <a href="#work/${next.slug}" data-swap>${esc(next.title)} →</a>
    </nav>`;
}

function initCase(dialog, grid, reducedMotion) {
  const inner = dialog.querySelector('.case-inner');
  let fromPage = false, returnFocus = null;

  function open(slug) {
    const i = PROJECTS.findIndex((p) => p.slug === slug);
    if (i < 0) return;
    const p = PROJECTS[i];
    inner.innerHTML = caseHTML(p, i);
    hydrateMedia(inner, p, reducedMotion);
    document.dispatchEvent(new CustomEvent('annotations:scan', { detail: inner }));
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    inner.querySelector('.case-title').focus({ preventScroll: true });
  }

  function route() {
    const m = location.hash.match(/^#work\/([\w-]+)$/);
    if (m) open(m[1]);
    else if (dialog.open) dialog.close();
  }

  grid.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-open]');
    if (!a) return;
    fromPage = true;
    returnFocus = a;
  });
  inner.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { dialog.close(); return; }
    const swap = e.target.closest('a[data-swap]');
    if (swap) {
      e.preventDefault();
      history.replaceState(null, '', swap.getAttribute('href'));
      open(swap.getAttribute('href').slice(6));
    }
  });
  // click on the backdrop closes
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    if (/^#work\//.test(location.hash)) {
      if (fromPage) history.back();
      else history.replaceState(null, '', '#work');
    }
    fromPage = false;
    const slug = location.hash.slice(6);
    (returnFocus || grid.querySelector(`[data-slug="${slug}"] a`))?.focus({ preventScroll: true });
    returnFocus = null;
    inner.querySelectorAll('video').forEach((v) => v.pause());
  });
  window.addEventListener('hashchange', route);
  route();
}
