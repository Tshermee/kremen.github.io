// The hero: one object, inspected like it's sitting in a viewport.
// Points / mesh / splats / depth are four readings of the same generated field.
// Pointer impacts are stored as a small ring of decaying disturbances and applied in the vertex shader:
//   displacement = proximity falloff × impact strength (from pointer velocity), relaxing back over ~2s.

import { buildField } from './cloud.js';
import { PALETTE } from './noise.js';

const SEED = 0x2f1a;
const FOV = 35;
const N_IMP = 6;
const MODES = ['POINTS', 'MESH', 'SPLATS', 'DEPTH'];

const FIELD_GLSL = /* glsl */ `
  #define N_IMP ${N_IMP}
  uniform float uTime;
  uniform float uAmbient;
  uniform float uAssemble;
  uniform float uScatter;
  uniform vec4 uImp[N_IMP];
  uniform vec3 uImpVel[N_IMP];
  uniform float uNear;
  uniform float uFar;

  float hash1(float n) { return fract(sin(n) * 43758.5453123); }

  vec3 fieldDisp(vec3 base, float seed, out float infl) {
    vec3 p = base;
    // slow ambient drift, low frequency, small
    p += uAmbient * 0.012 * vec3(
      sin(uTime * 0.31 + base.y * 2.3 + seed * 6.28),
      sin(uTime * 0.27 + base.z * 2.1 + seed * 4.10),
      sin(uTime * 0.35 + base.x * 1.9 + seed * 2.70));
    infl = 0.0;
    for (int i = 0; i < N_IMP; i++) {
      vec3 d = base - uImp[i].xyz;
      float d2 = dot(d, d);
      float f = exp(-d2 * 14.0) * uImp[i].w;
      infl += f;
      p += d * inversesqrt(d2 + 1e-4) * f * 0.2 + uImpVel[i] * f;
    }
    vec3 rnd = vec3(hash1(seed * 91.7 + 1.0), hash1(seed * 37.3 + 2.0), hash1(seed * 53.1 + 3.0)) - 0.5;
    p += rnd * uScatter;
    float a = clamp(uAssemble * 1.8 - seed * 0.8, 0.0, 1.0);
    a = a * a * (3.0 - 2.0 * a);
    p = mix(base * 1.6 + rnd * 4.0, p, a);
    infl = min(infl, 1.4);
    return p;
  }

  float depthNorm(vec4 mv) { return clamp((-mv.z - uNear) / (uFar - uNear), 0.0, 1.0); }
`;

const POINTS_VS = /* glsl */ `
  ${FIELD_GLSL}
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aSeed;
  attribute float aKind;
  attribute float aKeep;
  uniform float uScale;
  uniform float uMesh;
  uniform float uSplat;
  uniform float uDepth;
  uniform float uPR;
  uniform vec2 uScreenVel;
  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vOff;

  void main() {
    float infl;
    vec3 p = fieldDisp(position, aSeed, infl);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dz = depthNorm(mv);

    float s = aSize * 0.021;
    s *= mix(1.0, 4.2, uSplat) * mix(1.0, 0.6, uMesh);
    s *= 1.0 + infl * 1.5;
    gl_PointSize = max(s * uScale / -mv.z, 1.0 * uPR);

    float alpha = aKind < 0.5 ? 0.92 : (aKind < 1.5 ? 0.6 : 0.42);
    alpha *= mix(1.0, 0.42, dz * (1.0 - uDepth));                // farther = paler
    alpha *= mix(1.0, step(aKeep, 0.3) * 0.2, uSplat);            // splats: fewer, softer
    alpha *= mix(1.0, 0.3, uMesh);
    alpha = min(1.0, alpha * (1.0 + infl * 0.5));

    // depth diagnostic: tighter range than the fade, plus iso-depth bands
    float dzc = clamp((-mv.z - uNear - 0.55) / (uFar - uNear - 1.1), 0.0, 1.0);
    float band = step(0.5, fract(dzc * 9.0));
    vec3 depthCol = vec3(mix(0.06, 0.8, dzc) * (0.82 + 0.18 * band));
    vColor = mix(aColor, depthCol, uDepth);
    vAlpha = alpha;
    vOff = uScreenVel * infl * 0.34;
  }
`;

// Colour is applied multiplicatively onto the paper colour, like tinted plastic over a lightbox:
// order independent, so no sorting, and overlaps absorb rather than glow.
const POINTS_FS = /* glsl */ `
  uniform float uSplat;
  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vOff;

  float shape(vec2 c) {
    float r2 = dot(c, c);
    float disc = 1.0 - smoothstep(0.22, 0.34, r2);
    float g = exp(-r2 * 4.5) * (1.0 - smoothstep(0.8, 1.0, r2));
    return mix(disc, g, uSplat);
  }

  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    vec3 a = vec3(shape(c - vOff), shape(c), shape(c + vOff)) * vAlpha;
    if (a.r + a.g + a.b < 0.01) discard;
    gl_FragColor = vec4(mix(vec3(1.0), vColor, a), 1.0);
  }
`;

const LINES_VS = /* glsl */ `
  ${FIELD_GLSL}
  uniform float uMesh;
  varying float vAlpha;
  varying float vInfl;
  void main() {
    float seed = fract(sin(dot(position, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float infl;
    vec3 p = fieldDisp(position, seed, infl);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = uMesh * 0.72 * mix(1.0, 0.35, depthNorm(mv));
    vInfl = infl;
  }
`;
const LINES_FS = /* glsl */ `
  varying float vAlpha;
  varying float vInfl;
  void main() {
    vec3 col = mix(vec3(0.15, 0.15, 0.14), vec3(0.157, 0.843, 0.949), clamp(vInfl * 1.4, 0.0, 1.0));
    gl_FragColor = vec4(mix(vec3(1.0), col, vAlpha), 1.0);
  }
`;

const FACES_VS = /* glsl */ `
  ${FIELD_GLSL}
  attribute vec3 aColor;
  uniform float uMesh;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float seed = fract(sin(dot(position, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float infl;
    vec3 p = fieldDisp(position, seed, infl);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vAlpha = uMesh * 0.55 * mix(1.0, 0.5, depthNorm(mv));
  }
`;
const FACES_FS = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() { gl_FragColor = vec4(mix(vec3(1.0), vColor, vAlpha), 1.0); }
`;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const fmt = (v) => v.toFixed(3);

function pickPointCount() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  if (small || cores <= 4 || mem <= 4) return 26000;
  return 68000;
}

export async function initHero(root, { reducedMotion }) {
  const canvas = root.querySelector('.hero-canvas');
  const readout = root.querySelector('.hero-readout');
  const crosshair = root.querySelector('.hero-crosshair');
  const statEl = root.querySelector('[data-hero-stats]');
  const buttons = [...root.querySelectorAll('[data-mode]')];
  let reduced = reducedMotion.matches;

  const count = pickPointCount();
  const field = buildField({ seed: SEED, pointCount: count });
  root.querySelector('[data-hero-seed]').textContent = `SEED 0x${SEED.toString(16).toUpperCase()}`;

  let THREE, renderer;
  try {
    THREE = await import('three');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('[hero] WebGL unavailable, drawing a static sample instead.', err);
    return staticFallback(root, canvas, field, statEl, buttons);
  }

  THREE.ColorManagement.enabled = false;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(new THREE.Color(PALETTE.bg), 1);
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  const group = new THREE.Group();
  group.rotation.x = 0.1;
  scene.add(group);

  const impacts = Array.from({ length: N_IMP }, () => ({ pos: new THREE.Vector3(0, 99, 0), vel: new THREE.Vector3(), w: 0, born: 0 }));
  const uniforms = {
    uTime: { value: 0 },
    uAmbient: { value: reduced ? 0 : 1 },
    uAssemble: { value: reduced ? 1 : 0 },
    uScatter: { value: 0 },
    uImp: { value: impacts.map(() => new THREE.Vector4(0, 99, 0, 0)) },
    uImpVel: { value: impacts.map(() => new THREE.Vector3()) },
    uNear: { value: 4 },
    uFar: { value: 7 },
    uScale: { value: 1000 },
    uMesh: { value: 0 },
    uSplat: { value: 0 },
    uDepth: { value: 0 },
    uPR: { value: pixelRatio },
    uScreenVel: { value: new THREE.Vector2() },
  };
  const multiply = {
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.ZeroFactor,
    blendDst: THREE.SrcColorFactor,
  };

  // faces
  const faceGeo = new THREE.BufferGeometry();
  faceGeo.setAttribute('position', new THREE.BufferAttribute(field.faces, 3));
  faceGeo.setAttribute('aColor', new THREE.BufferAttribute(field.faceColors, 3));
  const faces = new THREE.Mesh(faceGeo, new THREE.ShaderMaterial({ uniforms, vertexShader: FACES_VS, fragmentShader: FACES_FS, side: THREE.DoubleSide, ...multiply }));
  faces.renderOrder = 0;
  // edges
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(field.edges, 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.ShaderMaterial({ uniforms, vertexShader: LINES_VS, fragmentShader: LINES_FS, ...multiply }));
  lines.renderOrder = 1;
  // points
  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.BufferAttribute(field.positions, 3));
  ptGeo.setAttribute('aColor', new THREE.BufferAttribute(field.colors, 3));
  ptGeo.setAttribute('aSize', new THREE.BufferAttribute(field.sizes, 1));
  ptGeo.setAttribute('aSeed', new THREE.BufferAttribute(field.seeds, 1));
  ptGeo.setAttribute('aKind', new THREE.BufferAttribute(field.kinds, 1));
  ptGeo.setAttribute('aKeep', new THREE.BufferAttribute(field.keeps, 1));
  const points = new THREE.Points(ptGeo, new THREE.ShaderMaterial({ uniforms, vertexShader: POINTS_VS, fragmentShader: POINTS_FS, ...multiply }));
  points.renderOrder = 2;
  for (const o of [faces, lines, points]) { o.frustumCulled = false; group.add(o); }

  // a hidden copy of the coarse mesh for picking (never rendered)
  const proxy = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const raycaster = new THREE.Raycaster();

  // ---------- layout ----------
  let width = 1, height = 1, camDist = 6;
  function layout() {
    const rect = root.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    const tanHalf = Math.tan((FOV * Math.PI) / 360);
    const wide = aspect > 1.1;
    // fit ~3.4 units of width on narrow screens, ~2.3 units of height on wide ones
    camDist = wide ? 6.3 : Math.max(6.4, 3.5 / (2 * tanHalf * aspect));
    camera.position.set(0, camDist * 0.11, camDist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    group.position.set(wide ? Math.min(1.1, (aspect - 1.1) * 1.1 + 0.35) : 0, wide ? 0.05 : 0.55, 0);
    uniforms.uNear.value = camDist - 1.7;
    uniforms.uFar.value = camDist + 1.7;
    const buf = renderer.getDrawingBufferSize(new THREE.Vector2());
    uniforms.uScale.value = buf.y / (2 * tanHalf);
    uniforms.uPR.value = pixelRatio;
    kick();
  }
  new ResizeObserver(layout).observe(root);

  // ---------- pointer ----------
  const ptr = { x: 0, y: 0, vx: 0, vy: 0, speed: 0, t: 0, inside: false, moved: false };
  const ndc = new THREE.Vector2();
  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const now = performance.now();
    const dt = Math.max(8, now - (ptr.t || now - 16));
    if (ptr.inside) {
      const vx = (x - ptr.x) / dt, vy = (y - ptr.y) / dt;
      ptr.vx += (vx - ptr.vx) * 0.5;
      ptr.vy += (vy - ptr.vy) * 0.5;
      ptr.speed = Math.hypot(ptr.vx, ptr.vy);
    }
    ptr.x = x; ptr.y = y; ptr.t = now; ptr.inside = true; ptr.moved = true;
    ndc.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
    kick();
  }
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerdown', (e) => {
    onMove(e);
    if (e.pointerType !== 'mouse') ptr.poke = true; // a tap is a small, deliberate hit
  });
  const leave = () => { ptr.inside = false; root.classList.remove('is-inspecting'); readout.hidden = true; };
  root.addEventListener('pointerleave', leave);
  root.addEventListener('pointercancel', leave);

  let cur = 0;
  const tmpV = new THREE.Vector3(), tmpC = new THREE.Vector3(), camRight = new THREE.Vector3(), camUp = new THREE.Vector3();
  const invQ = new THREE.Quaternion();
  const { min, max } = field.bounds;

  function probe(now) {
    if (!ptr.inside) return;
    group.updateMatrixWorld();
    proxy.matrixWorld.copy(group.matrixWorld);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(proxy, false);
    let near = 0, world = null;
    if (hits.length) { near = 1; world = hits[0].point; }
    else {
      group.getWorldPosition(tmpC);
      raycaster.ray.closestPointToPoint(tmpC, tmpV);
      const d = tmpV.distanceTo(tmpC);
      near = Math.max(0, Math.min(1, (2.1 - d) / 0.9));
      if (near > 0) world = tmpV;
    }
    root.classList.toggle('is-inspecting', near > 0);
    crosshair.style.transform = `translate(${ptr.x}px, ${ptr.y}px)`;

    if (hits.length) {
      const local = group.worldToLocal(hits[0].point.clone());
      const nx = (local.x - min[0]) / (max[0] - min[0]);
      const ny = (local.y - min[1]) / (max[1] - min[1]);
      const nz = (camera.position.distanceTo(hits[0].point) - uniforms.uNear.value) / (uniforms.uFar.value - uniforms.uNear.value);
      readout.textContent = `X ${fmt(nx)}\nY ${fmt(ny)}\nZ ${fmt(Math.min(1, Math.max(0, nz)))}`;
      readout.style.transform = `translate(${ptr.x + 14}px, ${ptr.y + 12}px)`;
      readout.hidden = false;
    } else readout.hidden = true;

    if (!world || !ptr.moved && !ptr.poke) return;
    const local = group.worldToLocal(world.clone());
    let imp = impacts[cur];
    if (imp.w < 0.02 || local.distanceTo(imp.pos) > 0.16 || now - imp.born > 140) {
      cur = (cur + 1) % N_IMP;
      imp = impacts[cur];
      imp.pos.copy(local); imp.w = 0; imp.vel.set(0, 0, 0); imp.born = now;
    }
    imp.pos.lerp(local, 0.5);
    const target = near * (ptr.poke ? 0.85 : 0.14 + Math.min(ptr.speed * 0.5, 0.86));
    imp.w = Math.max(imp.w, target);
    // screen velocity → object space drag
    camera.matrixWorld.extractBasis(camRight, camUp, tmpV);
    const drag = new THREE.Vector3().addScaledVector(camRight, ptr.vx).addScaledVector(camUp, -ptr.vy);
    const len = drag.length();
    if (len > 1e-4) {
      invQ.copy(group.quaternion).invert();
      drag.applyQuaternion(invQ).multiplyScalar(Math.min(len * 0.12, 0.2) / len * near);
      imp.vel.lerp(drag, 0.5);
    }
    ptr.moved = false;
    ptr.poke = false;
  }

  // ---------- modes ----------
  const weights = { uMesh: 0, uSplat: 0, uDepth: 0 };
  let tween = null;
  let mode = 'POINTS';
  function setMode(next) {
    if (next === mode) return;
    mode = next;
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    const from = { ...weights };
    const to = { uMesh: +(mode === 'MESH'), uSplat: +(mode === 'SPLATS'), uDepth: +(mode === 'DEPTH') };
    tween = { from, to, t0: performance.now(), dur: reduced ? 250 : 1100 };
    kick();
    updateStats(true);
  }
  for (const b of buttons) b.addEventListener('click', () => setMode(b.dataset.mode));

  // ---------- stats (real numbers) ----------
  let fps = 60, fpsFrames = 0, fpsT = performance.now(), drawCount = count;
  function updateStats(force) {
    const now = performance.now();
    if (!force && now - fpsT < 600) return;
    if (fpsFrames) fps = Math.round((fpsFrames * 1000) / (now - fpsT));
    fpsFrames = 0; fpsT = now;
    const parts = mode === 'MESH'
      ? [`${field.stats.tris.toLocaleString('en-US')} TRIS`, `${field.stats.edges.toLocaleString('en-US')} EDGES`]
      : mode === 'SPLATS'
        ? [`${Math.round(drawCount * 0.9 * 0.3).toLocaleString('en-US')} SPLATS`]
        : [`${drawCount.toLocaleString('en-US')} PTS`];
    statEl.textContent = [...parts, running && !reduced ? `${fps} FPS` : 'IDLE', `DPR ${pixelRatio.toFixed(2).replace(/\.?0+$/, '')}`].join(' · ');
  }

  // ---------- adaptive quality ----------
  let slowFrames = 0, sampled = 0;
  function adapt(dt) {
    if (reduced) return;
    sampled++;
    if (dt > 26) slowFrames++;
    if (sampled < 90) return;
    if (slowFrames > 45) {
      if (pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - 0.5); renderer.setPixelRatio(pixelRatio); layout(); }
      else if (drawCount > 16000) { drawCount = Math.round(drawCount * 0.7); ptGeo.setDrawRange(0, drawCount); }
    }
    sampled = 0; slowFrames = 0;
  }

  // ---------- loop ----------
  let running = true, last = performance.now(), t0 = last;
  const io = new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) kick(); }, { threshold: 0 });
  io.observe(root);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  reducedMotion.addEventListener('change', (e) => {
    reduced = e.matches;
    uniforms.uAmbient.value = reduced ? 0 : 1;
    if (reduced) uniforms.uAssemble.value = 1;
    kick();
  });

  let rafId = 0;
  function kick() { if (!rafId) { last = performance.now(); rafId = requestAnimationFrame(frame); } }

  function frame(now) {
    rafId = 0;
    const dt = Math.min(64, now - last);
    last = now;
    const sec = dt / 1000;

    if (!reduced) {
      uniforms.uTime.value = (now - t0) / 1000;
      group.rotation.y += sec * ((Math.PI * 2) / 95);
      if (uniforms.uAssemble.value < 1) uniforms.uAssemble.value = Math.min(1, (now - t0) / 2600); // wall clock, so slow devices don't assemble slowly
    }

    if (tween) {
      const k = Math.min(1, (now - tween.t0) / tween.dur);
      const e = ease(k);
      for (const key in weights) { weights[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * e; uniforms[key].value = weights[key]; }
      uniforms.uScatter.value = reduced ? 0 : Math.sin(Math.PI * k) * 0.16;
      if (k >= 1) tween = null;
    }

    probe(now);

    let active = false;
    impacts.forEach((imp, i) => {
      imp.w *= Math.exp(-sec * 1.3);
      imp.vel.multiplyScalar(Math.exp(-sec * 1.8));
      if (imp.w < 0.002) imp.w = 0; else active = true;
      uniforms.uImp.value[i].set(imp.pos.x, imp.pos.y, imp.pos.z, imp.w);
      uniforms.uImpVel.value[i].copy(imp.vel);
    });
    ptr.speed *= Math.exp(-sec * 5);
    ptr.vx *= Math.exp(-sec * 5);
    ptr.vy *= Math.exp(-sec * 5);
    const sv = uniforms.uScreenVel.value;
    const sp = Math.hypot(ptr.vx, ptr.vy);
    sv.set(sp > 1e-3 ? (ptr.vx / sp) * Math.min(sp * 0.5, 1) : 0, sp > 1e-3 ? (ptr.vy / sp) * Math.min(sp * 0.5, 1) : 0);

    renderer.render(scene, camera);
    fpsFrames++;
    adapt(dt);
    updateStats(false);

    const keepGoing = running && !document.hidden && (!reduced || tween || active || ptr.inside);
    if (keepGoing) rafId = requestAnimationFrame(frame);
  }

  layout();
  root.classList.add('is-live');
  updateStats(true);
  kick();
  return { setMode, modes: MODES };
}

// ---------- no WebGL: one still frame of the same field, drawn with canvas 2D ----------
function staticFallback(root, oldCanvas, field, statEl, buttons) {
  const canvas = document.createElement('canvas');
  canvas.className = oldCanvas.className;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', oldCanvas.getAttribute('aria-label') || '');
  oldCanvas.replaceWith(canvas);
  root.classList.add('is-static');
  for (const b of buttons) b.disabled = true;
  statEl.textContent = 'WEBGL UNAVAILABLE · STATIC SAMPLE';

  const draw = () => {
    const rect = root.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'multiply';
    const wide = rect.width / rect.height > 1.1;
    const scale = Math.min(canvas.width / (wide ? 5.2 : 3.4), canvas.height / 3.4);
    const cx = canvas.width * (wide ? 0.62 : 0.5), cy = canvas.height * (wide ? 0.5 : 0.38);
    const ry = 0.6, cr = Math.cos(ry), sr = Math.sin(ry), rx = 0.25, cxr = Math.cos(rx), sxr = Math.sin(rx);
    const { positions: p, colors: c, sizes: s } = field;
    const n = Math.min(field.stats.points, 30000);
    for (let i = 0; i < n; i++) {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
      const x1 = x * cr + z * sr, z1 = -x * sr + z * cr;
      const y1 = y * cxr - z1 * sxr, z2 = y * sxr + z1 * cxr;
      const a = 0.9 * (0.55 + 0.45 * (z2 + 1.4) / 2.8);
      const col = [0, 1, 2].map((k) => Math.round(255 * (1 - a + a * c[i * 3 + k])));
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      const d = Math.max(1, s[i] * dpr * 1.8);
      ctx.fillRect(cx + x1 * scale, cy - y1 * scale, d, d);
    }
  };
  draw();
  new ResizeObserver(draw).observe(root);
  return null;
}
