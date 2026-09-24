// Static canvas drawings: placeholders for missing project media, and lab thumbnails.
// Deliberately quiet: ink on paper, one accent colour at most.

import { rng, noise3, fbm, PALETTE } from './noise.js';

const PLATE = '#E9E6DD';
const ink = (a) => `rgba(23,23,23,${a})`;

function gaussianDot(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function withAlpha(hex, a) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

function jitterMesh(w, h, r, cols, jitter = 0.38) {
  const rows = Math.max(2, Math.round((cols * h) / w));
  const pts = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const edgeX = i === 0 || i === cols, edgeY = j === 0 || j === rows;
      pts.push([
        (i + (edgeX ? 0 : (r() - 0.5) * 2 * jitter)) * (w / cols),
        (j + (edgeY ? 0 : (r() - 0.5) * 2 * jitter)) * (h / rows),
      ]);
    }
  }
  const tris = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
      if (r() < 0.5) tris.push([pts[a], pts[b], pts[d]], [pts[a], pts[d], pts[c]]);
      else tris.push([pts[a], pts[b], pts[c]], [pts[b], pts[d], pts[c]]);
    }
  }
  return tris;
}
export { jitterMesh };

const DRAW = {
  // concentric rows of seats, seen from above
  halftone(ctx, w, h, r, accent) {
    const cx = w * 0.5, cy = h * 1.08;
    const n = noise3(3);
    for (let row = 0; row < 16; row++) {
      const rad = h * (0.35 + row * 0.052);
      const count = Math.round(rad / (h * 0.022));
      for (let k = 0; k <= count; k++) {
        const a = Math.PI + 0.25 + (k / count) * (Math.PI - 0.5);
        const x = cx + Math.cos(a) * rad * 1.25, y = cy + Math.sin(a) * rad;
        if (x < 0 || x > w || y < 0) continue;
        const s = 0.6 + 1.6 * (0.5 + n(x * 0.01, y * 0.01, 0));
        ctx.fillStyle = r() < 0.05 ? accent : ink(0.75);
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, s) * (h / 300), 0, Math.PI * 2); ctx.fill();
      }
    }
  },
  contours(ctx, w, h, r, accent) {
    const n = noise3(7);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const step = 2, sc = 3.2 / w;
    const acc = parseInt(accent.slice(1), 16);
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const v = fbm(n, x * sc, y * sc, 0.3, 3) * 9;
        const f = Math.abs(v - Math.round(v));
        if (f > 0.05) continue;
        const accentLine = Math.round(v) === 1;
        const i = (y * w + x) * 4;
        if (accentLine) { d[i] = (acc >> 16) & 255; d[i + 1] = (acc >> 8) & 255; d[i + 2] = acc & 255; }
        else { d[i] = 40; d[i + 1] = 39; d[i + 2] = 36; }
      }
    }
    ctx.putImageData(img, 0, 0);
  },
  clusters(ctx, w, h, r, accent) {
    const groups = Array.from({ length: 6 }, () => [w * (0.12 + r() * 0.76), h * (0.18 + r() * 0.64), 8 + r() * 26]);
    groups.forEach(([gx, gy, n], gi) => {
      for (let k = 0; k < n * 3; k++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * h * 0.08 * (n / 20 + 0.4);
        ctx.fillStyle = gi === 2 ? accent : ink(0.8);
        ctx.beginPath(); ctx.arc(gx + Math.cos(a) * d, gy + Math.sin(a) * d, h / 180, 0, Math.PI * 2); ctx.fill();
      }
    });
  },
  lines(ctx, w, h, r, accent) {
    const lh = h / 26;
    let y = h * 0.12;
    const x0 = w * 0.18, maxW = w * 0.64;
    ctx.globalCompositeOperation = 'multiply';
    while (y < h * 0.9) {
      const para = 2 + Math.floor(r() * 5);
      for (let k = 0; k < para && y < h * 0.9; k++) {
        const len = k === para - 1 ? maxW * (0.2 + r() * 0.5) : maxW * (0.85 + r() * 0.15);
        if (r() < 0.12) { ctx.fillStyle = withAlpha(accent, 0.8); ctx.fillRect(x0 - 3, y - lh * 0.15, len * (0.3 + r() * 0.5) + 6, lh * 0.75); }
        ctx.fillStyle = ink(0.4);
        ctx.fillRect(x0, y, len, lh * 0.3);
        y += lh;
      }
      y += lh * 0.8;
    }
  },
  mesh(ctx, w, h, r, accent) {
    const tris = jitterMesh(w, h, r, 14, 0.42);
    ctx.globalCompositeOperation = 'multiply';
    for (const t of tris) {
      ctx.beginPath(); ctx.moveTo(...t[0]); ctx.lineTo(...t[1]); ctx.lineTo(...t[2]); ctx.closePath();
      if (r() < 0.025) { ctx.fillStyle = withAlpha(accent, 0.5); ctx.fill(); }
      ctx.strokeStyle = ink(0.32); ctx.lineWidth = Math.max(1, h / 500); ctx.stroke();
    }
  },
  splats(ctx, w, h, r, accent) {
    ctx.globalCompositeOperation = 'multiply';
    const n = noise3(11);
    for (let k = 0; k < 420; k++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * h * 0.34;
      const x = w * 0.5 + Math.cos(a) * d * 1.4, y = h * 0.52 + Math.sin(a) * d;
      const v = n(x * 0.008, y * 0.008, 0);
      const c = v > 0.18 ? accent : v < -0.2 ? PALETTE.orange : '#8f8a80';
      gaussianDot(ctx, x, y, h * (0.02 + r() * 0.05), c, 0.35);
    }
  },
  grid(ctx, w, h, r, accent) {
    const hy = h * 0.34, vx = w * 0.5;
    ctx.strokeStyle = ink(0.45); ctx.lineWidth = Math.max(1, h / 520);
    for (let k = -14; k <= 14; k++) { ctx.beginPath(); ctx.moveTo(vx, hy); ctx.lineTo(vx + k * w * 0.12, h); ctx.stroke(); }
    for (let k = 1; k < 14; k++) { const y = hy + (h - hy) * Math.pow(k / 13, 2.1); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for (let k = 0; k < 9; k++) {
      const t = 0.35 + r() * 0.6, x = vx + (r() - 0.5) * w * t * 1.2, y = hy + (h - hy) * t * t;
      ctx.fillStyle = k === 3 ? accent : ink(0.85);
      const s = h * 0.035 * t;
      ctx.fillRect(x - s * 0.3, y - s * 2, s * 0.6, s * 2);
    }
  },
  graph(ctx, w, h, r, accent) {
    const nodes = Array.from({ length: 42 }, () => [w * (0.08 + r() * 0.84), h * (0.1 + r() * 0.8)]);
    ctx.strokeStyle = ink(0.35); ctx.lineWidth = Math.max(1, h / 600);
    nodes.forEach((a, i) => {
      const near = nodes.map((b, j) => [Math.hypot(a[0] - b[0], a[1] - b[1]), j]).sort((x, y) => x[0] - y[0]).slice(1, 3);
      for (const [, j] of near) { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...nodes[j]); ctx.stroke(); }
    });
    nodes.forEach((a, i) => {
      ctx.fillStyle = i % 9 === 0 ? accent : PLATE;
      ctx.strokeStyle = ink(0.85);
      ctx.beginPath(); ctx.arc(a[0], a[1], h / 110, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  },
  debate(ctx, w, h, r, accent) {
    const L = [w * 0.25, h * 0.5], R = [w * 0.75, h * 0.5];
    for (let k = 0; k < 26; k++) {
      const y1 = h * (0.2 + r() * 0.6), y2 = h * (0.2 + r() * 0.6);
      ctx.strokeStyle = k % 2 ? ink(0.4) : withAlpha(accent, 0.9);
      ctx.lineWidth = Math.max(1, h / 450);
      ctx.beginPath(); ctx.moveTo(L[0] + 20, y1);
      ctx.bezierCurveTo(w * 0.5, y1 + (r() - 0.5) * h * 0.3, w * 0.5, y2, R[0] - 20, y2); ctx.stroke();
    }
    for (const [cx, cy] of [L, R]) {
      for (let k = 0; k < 160; k++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * h * 0.14;
        ctx.fillStyle = ink(0.85);
        ctx.fillRect(cx + Math.cos(a) * d * 0.6, cy + Math.sin(a) * d * 1.4, h / 170, h / 170);
      }
    }
  },
  slices(ctx, w, h, r, accent) {
    const n = noise3(5);
    ctx.lineWidth = Math.max(1, h / 520);
    for (let k = 0; k < 34; k++) {
      const t = k / 33, y = h * (0.12 + t * 0.78);
      // a rough figure profile: head, shoulders, body
      const prof = t < 0.14 ? Math.sin((t / 0.14) * Math.PI) * 0.35 : t < 0.2 ? 0.25 : 0.55 + 0.1 * Math.sin(t * 5);
      const rx = w * 0.14 * (prof + 0.12 * n(t * 4, 0, 0)), ry = rx * 0.22;
      ctx.setLineDash(k % 3 ? [2, 3] : []);
      ctx.strokeStyle = k === 11 ? accent : ink(0.6);
      ctx.beginPath(); ctx.ellipse(w * 0.5 + n(t * 3, 1, 0) * w * 0.02, y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]);
  },
};

const LAB = {
  field(ctx, w, h, r) {
    const cx = w * 0.5, cy = h * 0.52, hx = w * 0.62, hy = h * 0.42;
    ctx.globalCompositeOperation = 'multiply';
    for (let k = 0; k < 2600; k++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * h * 0.38;
      let x = cx + Math.cos(a) * d * 1.35, y = cy + Math.sin(a) * d;
      const dx = x - hx, dy = y - hy, dd = Math.hypot(dx, dy), f = Math.exp(-(dd * dd) / (h * h * 0.02));
      x += (dx / (dd + 1e-3)) * f * h * 0.1; y += (dy / (dd + 1e-3)) * f * h * 0.1;
      const s = 1 + f * 2;
      if (f > 0.25) {
        ctx.fillStyle = withAlpha(PALETTE.cyan, 0.9); ctx.fillRect(x - f * 2, y, s, s);
        ctx.fillStyle = withAlpha(PALETTE.red, 0.9); ctx.fillRect(x + f * 2, y, s, s);
      } else { ctx.fillStyle = ink(0.7); ctx.fillRect(x, y, s, s); }
    }
  },
  multiply(ctx, w, h) {
    ctx.globalCompositeOperation = 'multiply';
    gaussianDot(ctx, w * 0.4, h * 0.45, h * 0.42, PALETTE.cyan, 0.95);
    gaussianDot(ctx, w * 0.58, h * 0.42, h * 0.38, PALETTE.orange, 0.95);
    gaussianDot(ctx, w * 0.5, h * 0.64, h * 0.3, PALETTE.red, 0.8);
  },
  lumadepth(ctx, w, h, r) {
    const half = w / 2;
    // left: a bright wall, a dark shadow, an object
    const scene = (x, y) => {
      let v = 0.86 - 0.1 * (y / h);
      if (y > h * 0.62) v = 0.62 - 0.2 * ((y - h * 0.62) / h);
      const dx = x - half * 0.45, dy = y - h * 0.5;
      if (Math.abs(dx) < half * 0.16 && Math.abs(dy) < h * 0.2) v = 0.35;
      if (y > h * 0.62 && x > half * 0.55 && x < half * 0.95 && y < h * 0.78) v = 0.22;
      return v;
    };
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (x < half) {
          const v = scene(x, y);
          d[i] = 255 * v * 1.02; d[i + 1] = 255 * v * 0.97; d[i + 2] = 255 * v * 0.9;
        } else {
          // luminance → depth, posterised: confidently wrong
          const v = Math.round(scene(x - half, y) * 6) / 6;
          d[i] = d[i + 1] = d[i + 2] = 255 * (1 - v) * 0.9 + 10;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = PALETTE.bg; ctx.fillRect(half - 1, 0, 2, h);
  },
  jitter(ctx, w, h, r) {
    const tris = jitterMesh(w, h, r, 9, 0.42);
    ctx.strokeStyle = ink(0.55); ctx.lineWidth = 1;
    for (const t of tris) { ctx.beginPath(); ctx.moveTo(...t[0]); ctx.lineTo(...t[1]); ctx.lineTo(...t[2]); ctx.closePath(); ctx.stroke(); }
  },
};

function prepare(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.height * dpr));
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PLATE;
  ctx.fillRect(0, 0, w, h);
  return { ctx, w, h };
}

export function drawPlaceholder(canvas, kind, seed, accent) {
  const { ctx, w, h } = prepare(canvas);
  (DRAW[kind] || DRAW.mesh)(ctx, w, h, rng(seed), accent);
  ctx.globalCompositeOperation = 'source-over';
}

export function drawLabThumb(canvas, kind, seed) {
  const { ctx, w, h } = prepare(canvas);
  ctx.fillStyle = PALETTE.bg; ctx.fillRect(0, 0, w, h);
  (LAB[kind] || LAB.jitter)(ctx, w, h, rng(seed));
  ctx.globalCompositeOperation = 'source-over';
}

// Draw once the canvas is near the viewport, and again if its size changes.
export function lazyDraw(canvas, fn) {
  let lastW = 0, lastH = 0, visible = false;
  const run = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!visible || width < 2 || (Math.abs(width - lastW) < 2 && Math.abs(height - lastH) < 2)) return;
    lastW = width; lastH = height;
    fn();
  };
  new IntersectionObserver(([e], io) => { if (e.isIntersecting) { visible = true; run(); } }, { rootMargin: '300px' }).observe(canvas);
  let timer = 0;
  new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(run, 120); }).observe(canvas);
}
