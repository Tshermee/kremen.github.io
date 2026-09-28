# marco cermusoni — site

Static site, no build step. Open with any static server (`npx serve .`), deployed as-is via `wrangler.jsonc`.

## Where things live

| file | what |
| --- | --- |
| `js/data.js` | **all content**: projects, lab entries, inputs, about text, links. Edit this, not the templates. |
| `js/hero.js` | the WebGL hero (three.js from jsdelivr), pointer field, POINTS / MESH / SPLATS / DEPTH, static fallback |
| `js/cloud.js` | generates the hero object (seeded, pure JS) |
| `js/work.js` | project grid, filtering, hover viewport, case-file dialog (`#work/<slug>`) |
| `js/lab.js` | lab log |
| `js/input.js` | SOURCE → DEPTH → POINTS → OUTPUT viewer |
| `js/annotate.js` | handwritten notes: `<span class="note" data-arrow="left">…</span>` |
| `js/drawings.js` | placeholder drawings for missing media + lab thumbnails |
| `css/style.css` | everything visual; colour tokens at the top |

## Replacing placeholders

- **Project media**: put files in `assets/work/` and set `media` on the project in `js/data.js`
  (`{ type: 'image', src, alt }` or `{ type: 'video', src, poster, alt }`). The "NO MEDIA" label disappears on its own.
- **Case files**: fill `year`, `role`, `tools`, `why`, `process`, `output`, `broke`, `notes`, `gallery`. Empty fields show as "not written yet".
- **Inputs**: set `src` (and optionally `depth`, white = near) on an entry in `INPUTS`. Without a depth map, depth is guessed from brightness.
- **Links**: fill the empty `href`s in `LINKS`. Empty ones render as "soon" instead of dead links.
