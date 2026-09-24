// Generates the hero object: an incomplete reconstruction of a lumpy volume.
// A fine icosphere is displaced by noise, punched with holes (areas the "scan" never saw),
// cut at the bottom, and sampled into points. A coarse icosphere with the same mask gives
// the low-poly MESH representation. Pure JS, no three.js, so the static fallback can reuse it.

import { rng, noise3, fbm, hexToRgb, PALETTE } from './noise.js';

function icosphere(detail) {
  const t = (1 + Math.sqrt(5)) / 2;
  const verts = [];
  const push = (x, y, z) => {
    const l = Math.hypot(x, y, z);
    verts.push(x / l, y / l, z / l);
    return verts.length / 3 - 1;
  };
  [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
   [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].forEach((v) => push(...v));
  let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4],
    [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let d = 0; d < detail; d++) {
    const cache = new Map();
    const mid = (a, b) => {
      const key = a < b ? a * 1e6 + b : b * 1e6 + a;
      let m = cache.get(key);
      if (m === undefined) {
        m = push(
          (verts[a * 3] + verts[b * 3]) / 2,
          (verts[a * 3 + 1] + verts[b * 3 + 1]) / 2,
          (verts[a * 3 + 2] + verts[b * 3 + 2]) / 2
        );
        cache.set(key, m);
      }
      return m;
    };
    const next = [];
    for (const [a, b, c] of faces) {
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  return { verts, faces };
}

const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const INK_DARK = hexToRgb('#2f2e2b');
const INK_LIGHT = hexToRgb('#9a958a');
const GROUND = hexToRgb('#aaa598');
const CYAN = hexToRgb(PALETTE.cyan);
const ORANGE = hexToRgb(PALETTE.orange);
const RED = hexToRgb(PALETTE.red);
const LIME = hexToRgb(PALETTE.lime);
const WHITE = [1, 1, 1];

export function buildField({ seed = 0x2f1a, pointCount = 60000 } = {}) {
  const r = rng(seed);
  const nShape = noise3(seed);
  const nRegion = noise3(seed + 101);
  const nMask = noise3(seed + 202);
  const S = [1.32, 0.84, 1.0];

  // Per-direction fields. Everything the object is made of comes from these.
  const sample = (x, y, z) => {
    const k = 1 + 0.34 * fbm(nShape, x * 1.05, y * 1.05, z * 1.05, 4) +
      0.07 * fbm(nShape, x * 3.1 + 4, y * 3.1, z * 3.1, 2);
    return {
      p: [x * k * S[0], y * k * S[1], z * k * S[2]],
      region: fbm(nRegion, x * 1.25 + 11, y * 1.25, z * 1.25, 3),
      iso: fbm(nRegion, x * 2.2 + 3, y * 2.2 - 5, z * 2.2, 3),
      grey: 0.5 + 0.9 * fbm(nShape, x * 2.6 + 7, y * 2.6, z * 2.6, 2),
      hole: fbm(nMask, x * 1.7, y * 1.7, z * 1.7, 3),
      floor: -0.5 + 0.12 * nMask(x * 2.3 + 9, 0.5, z * 2.3),
      dir: [x, y, z],
    };
  };
  const HOLE = 0.19;
  const keepFace = (a, b, c) => {
    const hole = (a.hole + b.hole + c.hole) / 3;
    const y = (a.dir[1] + b.dir[1] + c.dir[1]) / 3;
    const floor = (a.floor + b.floor + c.floor) / 3;
    return hole < HOLE && y > floor;
  };

  // ---------- fine surface, sampled into points ----------
  const fine = icosphere(4);
  const fv = [];
  for (let i = 0; i < fine.verts.length; i += 3) fv.push(sample(fine.verts[i], fine.verts[i + 1], fine.verts[i + 2]));

  const kept = [];
  const weights = [];
  let total = 0;
  for (const [a, b, c] of fine.faces) {
    const A = fv[a], B = fv[b], C = fv[c];
    if (!keepFace(A, B, C)) continue;
    const e1 = [B.p[0] - A.p[0], B.p[1] - A.p[1], B.p[2] - A.p[2]];
    const e2 = [C.p[0] - A.p[0], C.p[1] - A.p[1], C.p[2] - A.p[2]];
    const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0];
    const area = 0.5 * Math.hypot(cx, cy, cz);
    // uneven coverage, as if captured from one side more than the other
    const d = [(A.dir[0] + B.dir[0] + C.dir[0]) / 3, (A.dir[1] + B.dir[1] + C.dir[1]) / 3, (A.dir[2] + B.dir[2] + C.dir[2]) / 3];
    const coverage = 0.45 + 0.55 * Math.max(0, d[0] * 0.35 + d[1] * 0.45 + d[2] * 0.82);
    total += area * coverage;
    kept.push([A, B, C]);
    weights.push(total);
  }

  const nSurf = Math.round(pointCount * 0.9);
  const nGround = Math.round(pointCount * 0.08);
  const nFloat = pointCount - nSurf - nGround;

  const pos = new Float32Array(pointCount * 3);
  const col = new Float32Array(pointCount * 3);
  const size = new Float32Array(pointCount);
  const seedA = new Float32Array(pointCount);
  const kind = new Float32Array(pointCount);
  const keep = new Float32Array(pointCount);

  // random write order, so drawRange(0, n) is always an even subset
  const order = Uint32Array.from({ length: pointCount }, (_, i) => i);
  for (let i = pointCount - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = order[i]; order[i] = order[j]; order[j] = t;
  }
  let w = 0;
  const put = (p, c, s, k) => {
    const i = order[w++];
    pos.set(p, i * 3);
    col.set(c, i * 3);
    size[i] = s;
    seedA[i] = r();
    kind[i] = k;
    keep[i] = r();
  };

  let tally = { neutral: 0, colour: 0 };
  for (let n = 0; n < nSurf; n++) {
    const u = r() * total;
    let lo = 0, hi = weights.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (weights[m] < u) lo = m + 1; else hi = m; }
    const [A, B, C] = kept[lo];
    const s = Math.sqrt(r()), r2 = r();
    const a = 1 - s, b = s * (1 - r2), c = s * r2;
    const jitter = (r() - 0.5) * 0.022;
    const p = [0, 1, 2].map((k) => a * A.p[k] + b * B.p[k] + c * C.p[k] + (a * A.dir[k] + b * B.dir[k] + c * C.dir[k]) * jitter);
    const region = a * A.region + b * B.region + c * C.region + (r() - 0.5) * 0.07;
    const iso = a * A.iso + b * B.iso + c * C.iso;
    const grey = Math.min(1, Math.max(0, a * A.grey + b * B.grey + c * C.grey));
    let colour = mix3(INK_DARK, INK_LIGHT, grey);
    let vivid = true;
    if (region > 0.25) colour = CYAN;
    else if (region < -0.27) colour = ORANGE;
    else vivid = false;
    if (Math.abs(iso) < 0.012) { colour = RED; vivid = true; }
    if (r() < 0.003) { colour = LIME; vivid = true; }
    vivid ? tally.colour++ : tally.neutral++;
    put(p, colour, 0.7 + r() * 0.6, 0);
  }

  for (let n = 0; n < nGround; n++) {
    const th = r() * Math.PI * 2;
    const rho = 0.25 + 2.1 * Math.pow(r(), 1.35);
    const x = Math.cos(th) * rho * 1.25, z = Math.sin(th) * rho;
    const y = -0.64 + 0.06 * nShape(x * 1.4, 7.3, z * 1.4);
    put([x, y, z], r() < 0.04 ? CYAN : GROUND, 0.45 + r() * 0.5, 2);
  }

  const vivids = [CYAN, ORANGE, RED, LIME];
  for (let n = 0; n < nFloat; n++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const rad = 1.45 + r() * 1.0;
    const p = [Math.cos(th) * s * rad * S[0], u * rad * S[1] + 0.1, Math.sin(th) * s * rad * S[2]];
    const c = r() < 0.55 ? INK_LIGHT : vivids[Math.floor(r() * vivids.length)];
    put(p, c, 0.6 + r() * 1.4, 1);
  }

  // bounds of the kept surface, for the coordinate readout
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const tri of kept) for (const v of tri) for (let k = 0; k < 3; k++) {
    if (v.p[k] < min[k]) min[k] = v.p[k];
    if (v.p[k] > max[k]) max[k] = v.p[k];
  }

  // ---------- coarse mesh, same mask ----------
  const coarse = icosphere(3);
  const cv = [];
  for (let i = 0; i < coarse.verts.length; i += 3) cv.push(sample(coarse.verts[i], coarse.verts[i + 1], coarse.verts[i + 2]));
  const faceArr = [], faceCol = [], edgeArr = [];
  const edgeSeen = new Set();
  const light = [0.35, 0.8, 0.5];
  const ll = Math.hypot(...light);
  for (const [a, b, c] of coarse.faces) {
    const A = cv[a], B = cv[b], C = cv[c];
    if (!keepFace(A, B, C)) continue;
    faceArr.push(...A.p, ...B.p, ...C.p);
    const e1 = [B.p[0] - A.p[0], B.p[1] - A.p[1], B.p[2] - A.p[2]];
    const e2 = [C.p[0] - A.p[0], C.p[1] - A.p[1], C.p[2] - A.p[2]];
    const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    const nl = Math.hypot(nx, ny, nz) || 1;
    const lambert = Math.abs((nx * light[0] + ny * light[1] + nz * light[2]) / (nl * ll));
    const region = (A.region + B.region + C.region) / 3;
    let base = region > 0.25 ? CYAN : region < -0.27 ? ORANGE : INK_LIGHT;
    const tint = mix3(WHITE, base, 0.35 + 0.4 * (1 - lambert));
    for (let k = 0; k < 3; k++) faceCol.push(...tint);
    for (const [i, j] of [[a, b], [b, c], [c, a]]) {
      const key = i < j ? i * 1e5 + j : j * 1e5 + i;
      if (edgeSeen.has(key)) continue;
      edgeSeen.add(key);
      edgeArr.push(...cv[i].p, ...cv[j].p);
    }
  }

  return {
    seed,
    positions: pos,
    colors: col,
    sizes: size,
    seeds: seedA,
    kinds: kind,
    keeps: keep,
    faces: new Float32Array(faceArr),
    faceColors: new Float32Array(faceCol),
    edges: new Float32Array(edgeArr),
    bounds: { min, max },
    stats: {
      points: pointCount,
      tris: faceArr.length / 9,
      edges: edgeArr.length / 6,
      colourShare: tally.colour / (tally.colour + tally.neutral),
    },
  };
}
