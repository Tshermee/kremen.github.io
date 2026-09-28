// INPUT: a thing noticed, and what the computer makes of it.
//   SOURCE → DEPTH → POINTS → OUTPUT
// SOURCE is untouched. DEPTH is a supplied map, a synthetic ground truth (for the placeholder),
// or a brightness guess (LAB_003). POINTS resamples the image and offsets each sample by depth,
// so moving the pointer lets you look a little way "behind" the photo. OUTPUT separates depth slices.

import { INPUTS } from './data.js';

const STAGES = ['SOURCE', 'DEPTH', 'POINTS', 'OUTPUT'];
const BG = [242, 240, 233];
const SLICES = 6;

const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
const gray = (v) => { const c = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgb(${c},${c},${c})`; };

// ---------- placeholder still life, with its exact depth ----------
function stillLife(W, H) {
  const src = mk(W, H), dep = mk(W, H);
  const s = src.getContext('2d'), d = dep.getContext('2d');
  const hz = H * 0.6;
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

  // wall + table
  let g = s.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, '#E2DDD1'); g.addColorStop(1, '#D3CCBD');
  s.fillStyle = g; s.fillRect(0, 0, W, hz);
  const pool = s.createRadialGradient(W * 0.25, H * 0.16, 0, W * 0.25, H * 0.16, W * 0.75);
  pool.addColorStop(0, 'rgba(255,252,243,0.8)'); pool.addColorStop(1, 'rgba(255,252,243,0)');
  s.fillStyle = pool; s.fillRect(0, 0, W, hz);
  g = s.createLinearGradient(0, hz, 0, H);
  g.addColorStop(0, '#C6BEAB'); g.addColorStop(1, '#ADA38D');
  s.fillStyle = g; s.fillRect(0, hz, W, H - hz);
  s.fillStyle = 'rgba(255,255,255,0.35)'; s.fillRect(0, hz, W, 2);

  d.fillStyle = gray(0.1); d.fillRect(0, 0, W, hz);
  g = d.createLinearGradient(0, hz, 0, H);
  g.addColorStop(0, gray(0.2)); g.addColorStop(1, gray(0.96));
  d.fillStyle = g; d.fillRect(0, hz, W, H - hz);

  const slab = { x: W * 0.17, y: H * 0.27, w: W * 0.33, h: H * 0.45 };
  const base = slab.y + slab.h;
  const disc = { x: W * 0.67, y: H * 0.81, rx: W * 0.18, ry: H * 0.05, t: H * 0.028 };
  const ball = { x: W * 0.77, y: H * 0.585, r: W * 0.05 };

  // coloured shadows: light goes through the plastic before it hits the table
  s.save();
  s.globalCompositeOperation = 'multiply';
  s.filter = `blur(${Math.round(W * 0.018)}px)`;
  s.fillStyle = 'rgba(236,128,60,0.6)';
  s.beginPath();
  s.moveTo(slab.x + 6, base); s.lineTo(slab.x + slab.w, base);
  s.lineTo(slab.x + slab.w + W * 0.26, base - H * 0.085); s.lineTo(slab.x + W * 0.26, base - H * 0.085);
  s.closePath(); s.fill();
  s.fillStyle = 'rgba(40,190,220,0.45)';
  s.beginPath(); s.ellipse(disc.x + W * 0.09, disc.y - H * 0.02, disc.rx, disc.ry * 1.1, 0, 0, Math.PI * 2); s.fill();
  s.fillStyle = 'rgba(60,40,30,0.35)';
  s.beginPath(); s.ellipse(ball.x + W * 0.03, ball.y + ball.r * 0.9, ball.r * 1.3, ball.r * 0.3, 0, 0, Math.PI * 2); s.fill();
  s.restore();

  // red ball, far
  let bg = s.createRadialGradient(ball.x - ball.r * 0.35, ball.y - ball.r * 0.4, ball.r * 0.1, ball.x, ball.y, ball.r);
  bg.addColorStop(0, '#FF8C92'); bg.addColorStop(0.5, '#F2434F'); bg.addColorStop(1, '#A8222C');
  s.fillStyle = bg; s.beginPath(); s.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); s.fill();
  bg = d.createRadialGradient(ball.x - ball.r * 0.2, ball.y - ball.r * 0.2, 0, ball.x, ball.y, ball.r);
  bg.addColorStop(0, gray(0.36)); bg.addColorStop(1, gray(0.27));
  d.fillStyle = bg; d.beginPath(); d.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); d.fill();

  // translucent orange slab, standing
  s.save();
  s.globalCompositeOperation = 'multiply';
  rr(s, slab.x, slab.y, slab.w, slab.h, W * 0.012);
  s.fillStyle = 'rgba(255,138,61,0.72)'; s.fill();
  rr(s, slab.x + slab.w * 0.14, slab.y + slab.h * 0.08, slab.w * 0.72, slab.h * 0.38, W * 0.006);
  s.fillStyle = 'rgba(214,96,40,0.35)'; s.fill();
  s.strokeStyle = 'rgba(160,70,20,0.35)'; s.lineWidth = 2;
  for (let k = 1; k < 7; k++) { const y = slab.y + slab.h * (0.52 + k * 0.06); s.beginPath(); s.moveTo(slab.x + slab.w * 0.1, y); s.lineTo(slab.x + slab.w * 0.9, y); s.stroke(); }
  s.beginPath(); s.arc(slab.x + slab.w * 0.5, slab.y + slab.h * 0.27, slab.w * 0.1, 0, Math.PI * 2);
  s.fillStyle = 'rgba(190,80,30,0.4)'; s.fill();
  s.fillStyle = 'rgba(200,90,30,0.55)'; s.fillRect(slab.x + slab.w - W * 0.01, slab.y + 4, W * 0.01, slab.h - 8);
  s.restore();
  s.fillStyle = 'rgba(255,255,255,0.45)'; s.fillRect(slab.x + 3, slab.y + 8, 2, slab.h - 16);
  rr(d, slab.x, slab.y, slab.w, slab.h, W * 0.012);
  d.fillStyle = gray(0.52); d.fill();

  // cyan disc, lying flat, near
  s.save();
  s.globalCompositeOperation = 'multiply';
  s.fillStyle = 'rgba(20,170,200,0.75)';
  s.beginPath(); s.ellipse(disc.x, disc.y + disc.t, disc.rx, disc.ry, 0, 0, Math.PI); s.lineTo(disc.x - disc.rx, disc.y); s.ellipse(disc.x, disc.y, disc.rx, disc.ry, 0, Math.PI, 0, true); s.closePath(); s.fill();
  s.fillStyle = 'rgba(40,215,242,0.6)';
  s.beginPath(); s.ellipse(disc.x, disc.y, disc.rx, disc.ry, 0, 0, Math.PI * 2); s.fill();
  s.restore();
  s.strokeStyle = 'rgba(255,255,255,0.6)'; s.lineWidth = 2;
  s.beginPath(); s.ellipse(disc.x, disc.y, disc.rx * 0.92, disc.ry * 0.8, 0, Math.PI * 1.1, Math.PI * 1.55); s.stroke();
  g = d.createLinearGradient(0, disc.y - disc.ry, 0, disc.y + disc.ry + disc.t);
  g.addColorStop(0, gray(0.78)); g.addColorStop(1, gray(0.9));
  d.fillStyle = g;
  d.beginPath(); d.ellipse(disc.x, disc.y + disc.t / 2, disc.rx, disc.ry + disc.t / 2, 0, 0, Math.PI * 2); d.fill();

  // grain, so it behaves a bit more like a photo
  const img = s.getImageData(0, 0, W, H), px = img.data;
  let seed = 7;
  for (let i = 0; i < px.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const n = ((seed / 2147483647) - 0.5) * 12;
    px[i] += n; px[i + 1] += n; px[i + 2] += n;
  }
  s.putImageData(img, 0, 0);
  const soft = mk(W, H), sc = soft.getContext('2d');
  sc.filter = 'blur(2px)'; sc.drawImage(dep, 0, 0);
  return { src, dep: soft, depthKind: 'SYNTHETIC · GROUND TRUTH' };
}

// ---------- brightness guess, for real photos without a depth map ----------
function lumaDepth(src) {
  const W = src.width, H = src.height;
  const out = mk(W, H), o = out.getContext('2d');
  o.filter = `grayscale(1) blur(${Math.round(W / 120)}px) contrast(1.15)`;
  o.drawImage(src, 0, 0);
  return out;
}

const loadImage = (url) => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = url; });
function toCanvas(img, maxH = 1000) {
  const k = Math.min(1, maxH / img.naturalHeight);
  const c = mk(Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

async function loadInput(item) {
  if (!item.src) return stillLife(720, 900);
  const src = toCanvas(await loadImage(item.src));
  if (item.depth) {
    const dimg = await loadImage(item.depth);
    const dep = mk(src.width, src.height);
    dep.getContext('2d').drawImage(dimg, 0, 0, dep.width, dep.height);
    return { src, dep, depthKind: 'SUPPLIED MAP' };
  }
  return { src, dep: lumaDepth(src), depthKind: 'BRIGHTNESS GUESS · SEE LAB_003' };
}

export async function initInput(section, { reducedMotion }) {
  const item = INPUTS[0];
  const fig = section.querySelector('.input-figure');
  const stage = fig.querySelector('.input-stage');
  const [cSrc, cDep, cPts] = ['source', 'depth', 'points'].map((k) => stage.querySelector(`.layer-${k}`));
  const info = fig.querySelector('[data-stage-info]');
  const buttons = [...fig.querySelectorAll('[data-stage]')];

  fig.querySelector('[data-input-id]').textContent = item.id;
  fig.querySelector('[data-input-place]').textContent = item.place;
  fig.querySelector('[data-input-date]').textContent = item.date;
  const noteEl = fig.querySelector('.input-note');
  if (item.note) noteEl.textContent = item.note; else noteEl.remove(); // before annotations are inked
  stage.setAttribute('aria-label', item.alt);

  let data;
  try { data = await loadInput(item); }
  catch (err) { info.textContent = `COULD NOT LOAD ${item.src}`; return; }
  const { src, dep, depthKind } = data;
  const W = src.width, H = src.height;
  stage.style.setProperty('--ratio', `${W} / ${H}`);
  for (const [c, from] of [[cSrc, src], [cDep, dep]]) { c.width = W; c.height = H; c.getContext('2d').drawImage(from, 0, 0); }

  // ---------- sampling ----------
  const cols = window.innerWidth < 700 ? 110 : 150;
  const step = W / cols, rows = Math.floor(H / step);
  const sd = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const dd = dep.getContext('2d').getImageData(0, 0, W, H).data;
  const n = cols * rows;
  const S = { x: new Float32Array(n), y: new Float32Array(n), d: new Float32Array(n), c: new Uint32Array(n), h: new Float32Array(n) };
  const little = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
  const pack = (r, g, b) => (little ? (255 << 24) | (b << 16) | (g << 8) | r : (r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
  let k = 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = Math.min(W - 1, Math.round((i + 0.5) * step)), y = Math.min(H - 1, Math.round((j + 0.5) * step));
    const o = (y * W + x) * 4;
    S.x[k] = (i + 0.5) / cols; S.y[k] = ((j + 0.5) * step) / H;
    S.d[k] = dd[o] / 255;
    S.c[k] = pack(sd[o], sd[o + 1], sd[o + 2]);
    S.h[k] = ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1;
    k++;
  }
  const bgPx = pack(...BG);

  // ---------- render ----------
  let ctx, img, buf, bw = 0, bh = 0;
  function resize() {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    bw = Math.max(1, Math.round(rect.width * dpr)); bh = Math.max(1, Math.round(rect.height * dpr));
    cPts.width = bw; cPts.height = bh;
    ctx = cPts.getContext('2d');
    img = ctx.createImageData(bw, bh);
    buf = new Uint32Array(img.data.buffer);
    kick();
  }

  const P = { size: 1, explode: 0, mx: 0, my: 0, tx: 0, ty: 0, t: 0 };
  let tween = null;
  function render() {
    buf.fill(bgPx);
    const spacing = bw / cols;
    const par = 0.045, ex = P.explode;
    const ang = P.t * 0.7;
    for (let i = 0; i < n; i++) {
      const d = S.d[i];
      // sparse background: far samples thin out as the image turns into points
      if (d < 0.2 && S.h[i] < 0.55 * (1 - P.size)) continue;
      const dz = d - 0.5;
      const slice = Math.floor(d * SLICES) / (SLICES - 1) - 0.5;
      let x = S.x[i] * bw + dz * P.mx * bw * par + slice * ex * bw * 0.12 * Math.cos(ang);
      let y = S.y[i] * bh + dz * P.my * bh * par + slice * ex * bh * 0.05 * Math.sin(ang) - slice * ex * bh * 0.03;
      const s = Math.max(1, Math.round(spacing * (P.size + (1 - P.size) * (0.32 + 0.3 * d))));
      const x0 = Math.round(x - s / 2), y0 = Math.round(y - s / 2);
      const c = S.c[i];
      for (let yy = Math.max(0, y0); yy < Math.min(bh, y0 + s); yy++) {
        const row = yy * bw;
        for (let xx = Math.max(0, x0); xx < Math.min(bw, x0 + s); xx++) buf[row + xx] = c;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  let current = 'SOURCE', visible = false, raf = 0, last = 0;
  const reduced = () => reducedMotion.matches;
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0;
    const dt = Math.min(64, now - last) / 1000; last = now;
    const pointsy = current === 'POINTS' || current === 'OUTPUT';
    if (tween) {
      const k = Math.min(1, (now - tween.t0) / tween.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      P.size = tween.s0 + (tween.s1 - tween.s0) * e;
      P.explode = tween.e0 + (tween.e1 - tween.e0) * e;
      if (k >= 1) tween = null;
    }
    const a = 1 - Math.exp(-dt * 6);
    P.mx += (P.tx - P.mx) * a; P.my += (P.ty - P.my) * a;
    if (current === 'OUTPUT' && !reduced()) P.t += dt;
    if (buf && pointsy) render();
    const settling = Math.abs(P.tx - P.mx) + Math.abs(P.ty - P.my) > 0.002;
    if (visible && (tween || settling || (current === 'OUTPUT' && !reduced()))) raf = requestAnimationFrame(frame);
  }

  function setStage(next) {
    const prev = current;
    current = next;
    fig.dataset.stage = next;
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.stage === next));
    const target = { SOURCE: [1, 0], DEPTH: [1, 0], POINTS: [0, 0], OUTPUT: [0, 1] }[next];
    const fromImage = prev === 'SOURCE' || prev === 'DEPTH';
    tween = { t0: performance.now(), dur: reduced() ? 1 : fromImage ? 1400 : 1000, s0: fromImage ? 1 : P.size, s1: target[0], e0: P.explode, e1: target[1] };
    info.textContent = {
      SOURCE: `SOURCE · ${W}×${H} · UNTOUCHED`,
      DEPTH: `DEPTH · ${depthKind} · WHITE = NEAR`,
      POINTS: `POINTS · ${n.toLocaleString('en-US')} SAMPLES · MOVE TO LOOK BEHIND`,
      OUTPUT: `OUTPUT · ${SLICES} DEPTH SLICES`,
    }[next];
    kick();
  }
  buttons.forEach((b) => b.addEventListener('click', () => setStage(b.dataset.stage)));

  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    P.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    P.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    kick();
  });
  stage.addEventListener('pointerleave', () => { P.tx = 0; P.ty = 0; kick(); });

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(stage);
  new ResizeObserver(resize).observe(stage);
  fig.classList.add('is-ready');
  setStage('SOURCE');
}
