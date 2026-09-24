// ─────────────────────────────────────────────────────────────────────────────
// Everything written on the site lives here. Edit this file, not the templates.
//
// Unknown things stay null / [] on purpose. Nothing below was invented: empty
// fields render as quiet "not written yet" markers until they're filled in.
//
// MEDIA
//   media: { type: 'image', src: 'assets/work/<slug>.jpg', alt: '…' }
//   media: { type: 'video', src: 'assets/work/<slug>.mp4', poster: 'assets/work/<slug>.jpg', alt: '…' }
//   Videos load lazily, only once they scroll near the viewport.
//
// GALLERY (inside a project's case file)
//   gallery: [{ src, alt, meta: ['RUN_023', 'PIXEL DEVICE', '52 FPS'], note: 'finally stopped exploding here' }]
//   `meta` is shown in monospace next to the image, `note` is handwritten. Both optional.
// ─────────────────────────────────────────────────────────────────────────────

export const TAGS = {
  PROTOTYPE: { label: 'Prototype', color: 'var(--orange)' },
  PRODUCT: { label: 'Product', color: 'var(--ink)' },
  AI: { label: 'AI', color: 'var(--lime)' },
  SPATIAL: { label: 'Spatial tech', color: 'var(--cyan)' },
  COMMUNITY: { label: 'Community', color: 'var(--red)' },
};

const empty = {
  year: null,
  role: null,
  tools: [], // e.g. ['UNITY', 'CUDA', 'QUEST'] — shown on hover and in the case file
  media: null,
  why: null,
  process: null,
  output: null,
  broke: null,
  notes: null,
  gallery: [],
  links: [],
};

export const PROJECTS = [
  {
    ...empty,
    slug: 'siggraph-vr-theater',
    title: 'SIGGRAPH VR Theater',
    summary: 'A VR theater program at SIGGRAPH, bringing spatial storytelling to a live festival audience.',
    tags: ['SPATIAL', 'COMMUNITY'],
    placeholder: 'halftone',
  },
  {
    ...empty,
    slug: 'espace-v',
    title: 'Espace V',
    summary: 'A spatial tech project exploring immersive space.',
    tags: ['SPATIAL'],
    placeholder: 'contours',
  },
  {
    ...empty,
    slug: 'v-unframed',
    title: 'V Unframed',
    summary: 'A community initiative bringing people together.',
    tags: ['COMMUNITY'],
    placeholder: 'clusters',
  },
  {
    ...empty,
    slug: 'bossdocs',
    title: 'bossDocs',
    summary: 'An AI product for working with documents.',
    tags: ['PRODUCT', 'AI'],
    placeholder: 'lines',
  },
  {
    ...empty,
    slug: 'alexandria',
    title: 'Alexandria',
    summary: 'A spatial computing project.',
    tags: ['SPATIAL'],
    placeholder: 'mesh',
  },
  {
    ...empty,
    slug: 'gaussians-on-android',
    title: 'Gaussians on Android',
    summary: 'Bringing Gaussian splat rendering to Android.',
    tags: ['PROTOTYPE', 'SPATIAL'],
    placeholder: 'splats',
  },
  {
    ...empty,
    slug: 'vfs-vr-ar',
    title: 'VR & AR Program at Vancouver Film School',
    summary: 'Teaching the VR & AR development program at Vancouver Film School.',
    tags: ['SPATIAL', 'COMMUNITY'],
    placeholder: 'grid',
    links: [{ label: 'Vancouver Film School — VR/AR program', href: 'https://vfs.edu/programs/vrar' }],
  },
  {
    ...empty,
    slug: 'kreis-social-xr',
    title: 'Kreis Immersive: Social XR Stack',
    summary: 'A social XR stack built under Kreis Immersive.',
    tags: ['PRODUCT', 'SPATIAL'],
    placeholder: 'graph',
  },
  {
    ...empty,
    slug: 'debate-machines',
    title: 'Debate Machines',
    summary: 'An AI prototype exploring machine-driven debate.',
    tags: ['PROTOTYPE', 'AI'],
    placeholder: 'debate',
  },
  {
    ...empty,
    slug: 'shakespeare-murder-mystery',
    title: 'Shakespeare Murder Mystery',
    summary: 'A multiplayer XR Shakespearean murder mystery with real actors and volumetric capture.',
    tags: ['PROTOTYPE', 'SPATIAL'],
    placeholder: 'slices',
  },
];

// LAB: experiments, not products. These four are the experiments this site itself runs on,
// so every status below is true today. Add older sketches, shaders and failures here.
export const LAB = [
  {
    id: 'LAB_001',
    title: 'Field disturbance',
    text: 'The pointer as a force on a point set: proximity × velocity × falloff, then everything relaxes back. Slow hands, gentle field. Fast hands, mess.',
    tags: ['REALTIME', 'POINTS', 'SHADER'],
    status: 'RUNNING',
    statusColor: 'var(--cyan)',
    date: '2026.09.24',
    thumb: 'field',
    href: '#top',
    hrefLabel: 'it’s the thing at the top',
  },
  {
    id: 'LAB_002',
    title: 'Multiply splats',
    text: 'Gaussians blended by multiplying instead of alpha. No depth sorting needed, and overlaps absorb colour like stacked plastic instead of glowing.',
    tags: ['SPLATS', 'SHADER', 'TEST'],
    status: 'WORKS',
    statusColor: 'var(--lime)',
    date: '2026.09.24',
    thumb: 'multiply',
  },
  {
    id: 'LAB_003',
    title: 'Brightness is not depth',
    text: 'For photos without a depth map, depth gets guessed from brightness. It’s wrong in obvious ways: white walls come forward, shadows fall into holes. Kept it anyway.',
    tags: ['DEPTH', 'TEST', 'FAILURE'],
    status: 'WRONG, KEPT',
    statusColor: 'var(--red)',
    date: '2026.09.24',
    thumb: 'lumadepth',
    note: 'why does this look better broken?',
  },
  {
    id: 'LAB_004',
    title: 'Jittered-grid wireframes',
    text: 'A cheap fake triangulation for looking “under” project images. Hover a project to see it.',
    tags: ['MESH', 'TEST'],
    status: 'WORKS',
    statusColor: 'var(--lime)',
    date: '2026.09.24',
    thumb: 'jitter',
  },
];

// INPUT: things noticed. Not a photography portfolio.
//   depth: optional path to a depth map (white = near). Without it, depth is guessed from brightness (see LAB_003).
//   The first entry is a generated placeholder still life; replace `src: null` with a real photo.
export const INPUTS = [
  {
    id: 'INPUT_000',
    src: null, // e.g. 'assets/input/038.jpg'
    depth: null, // e.g. 'assets/input/038-depth.png'
    alt: 'Placeholder still life: a translucent orange slab and a cyan disc on a table, casting coloured shadows.',
    place: 'PLACEHOLDER',
    date: '2026.09.24',
    note: 'the colour only exists because light passes through it',
  },
];

export const ABOUT = {
  paragraphs: [
    'I’m Marco. I make things that sit somewhere between computer graphics, AI, spatial computing and a room full of people.',
    'Some of them are products, some are prototypes, some are events, and some only ever worked on one laptop. They usually start with something I noticed and wanted to rebuild in software, just to see what would happen.',
  ],
  areas: ['Computer graphics', 'AI', 'Spatial computing', 'XR', 'Realtime systems', 'Community & events', 'Experimental software'],
};

// Empty href = rendered as "pending" text instead of a dead link.
export const LINKS = [
  { label: 'GitHub', href: 'https://github.com/Tshermee' },
  { label: 'LinkedIn', href: '' },
  { label: 'Instagram', href: '' },
  { label: 'Email', href: '' }, // 'mailto:…'
];
