---
task: DEEP-LOOK
status: ready-for-review
kind: look-test
flag: the-deep
player_facing: no
---

# D0 DEEP-LOOK: the first look test for The Deep (11 October 2026)

Card D0 of `docs/THE_DEEP.md`. A look test for the hidden underwater world,
behind a new switch that stays off. Nothing is reachable in the game: no file
in `src/` outside `src/deep/` imports the new code, and a test checks that.

## What was built

New modules in `src/deep/`, named for what they do so D4 can use them for the
real zone:

| File | What it does |
| --- | --- |
| `depth-colour.js` | The numbers: how daylight and sight lose red, then green, then blue with depth; caustic and light-shaft strength by depth; the eye's adjustment. Pure, no graphics |
| `water-shader.js` | Shared shader code: depth colour, per-colour haze that ends in the colour of the open water, caustics on sunlit surfaces (sun only, so lamps keep their own colour at depth), sand ripples, rock grain. Patches normal lit materials, so the car and everything else use it |
| `water-surface.js` | The surface seen from below: rippled ceiling, Snell's window, sun as a soft disc, silver mirror outside the window; plus the open-water background |
| `light-shafts.js` | Slanting sun shafts on a fixed grid under the surface, drifting, thinning with depth, strongest toward the sun. Capped at 40 |
| `marine-snow.js` | Drifting specks that wrap around the camera. One draw, all movement in the shader. Capped at 2000 |
| `sea-floor-shape.js` | Pure: the trail's depth (5 m shallows, level kelp forest, slope to about 30 m, still falling past the end), where kelp, seagrass and rocks grow, with hard caps (700, 2000, 120) |
| `sea-floor.js` | Rippled sand and rocky ground mesh, instanced seagrass tufts, three instanced rock shapes |
| `kelp.js` | Tall swaying stems with leaf blades, instanced in chunks along the trail, sway and flutter in the vertex shader, light through the blades, shadows that sway too |
| `fish-rules.js` | Pure: fish parting rule, the school's looping path, school shape, hard cap 800 |
| `fish-school.js` | One school of 480 silver fish in one instanced mesh, tail beat in the shader, parting around a point (the car, read only) |
| `headlights.js` | Two spot lights, glowing lenses and a faint beam in the water |
| `underwater-look.js` | Puts it together: sun and skylight, reflection map, background, ceiling, shafts, snow, update per frame |
| `look-quality.js` | What High and Performance draw (counts, shadow size, direct or composite), all inside the caps |

`src/feature-flags.js`: new switch `the-deep: 'dev'` (off in the game and in
ordinary QA; only a named `?flags=the-deep` on a private QA build admits it,
and nothing reads it yet).

Look-test page: `tools/deep-look.html` + `tools/deep-look.js`. A 300 m stretch of
sea floor from 5 m into a kelp forest and down to about 30 m, the Falcone F42
(built by the existing `createClassicVehicle`, no new model, no downloads) on
the sand with headlights, six fixed views, and `window.__deepLook` for views and
frame measurements. `?quality=high|performance`; High uses the game's
composite pipeline (bloom, SMAA, 2048 shadows), Performance its direct one
(1024 shadows). `tools/scenarios/deep-look.mjs` takes the six pictures through
the browser harness, joins them, and measures delivered and GPU frame times;
`tools/vite-qa.config.js` gains the page so the harness serves it.

## Picture sheet

[`docs/board/looks/the-deep/look-1.jpg`](../board/looks/the-deep/look-1.jpg)
(370 KB) and its [review](../board/looks/the-deep/look-1-review.md). Recipe:
`node tools/browser-harness.mjs scenario deep-look`. Three rounds, looking at
each sheet with the image reader: round one fixed the overall tone (the car was
brown, the shafts were hard tubes, the kelp looked like banana leaves, a hard
band showed at the far edge of the deep); round two fixed the headlight beam,
the sun disc and the first view's framing; round three fixed two fish a metre
from the camera in view 1, clipped framing, and a bigger, tighter school. Open
points are in the review.

## Frame times

On this laptop (NVIDIA RTX A1000, Chrome headless on the real GPU), 300
delivered frames per view with the clock running, all six views:

| Quality | Pixel ratio | Delivered p95 | Worst frame | GPU p95 | Draw calls | Triangles |
| --- | --- | --- | --- | --- | --- | --- |
| High | 1.0 | 16.8 ms | 17.1 ms | 9.0 to 12.7 ms | 94 to 150 | 0.66 to 1.26 M |
| High | 1.6 | 16.8 ms | 17.0 ms | 12.3 to 16.2 ms | 94 to 150 | 0.66 to 1.26 M |
| Performance | 1.0 | 16.8 ms | 16.9 ms | 4.7 to 10.4 ms | 71 to 126 | 0.33 to 0.52 M |

All at or under the 18.5 ms aim (the display is locked to 60 Hz, so 16.8 ms
means no missed frames). High at 1.6 is the tight case. Construction of the
stretch took 0.92 s; the first frame 3.5 s (shaders compile once, so the real
zone needs the game's warm-up). Measured with no other heavy job running.

## Tests

- New `node tools/test-deep-look.mjs` (5,283 checks, picked up automatically by
  the runner): depth colour curve (red first, blue deep, caustics and shafts
  fade and end, bad input safe), the fish parting rule (nobody inside the gap,
  nobody outside the ring moved, order kept, car point never changed), fish,
  kelp, seagrass, rock, snow and shaft caps, quality settings inside every cap,
  mesh sizes, the trail's depths, same seed same forest, and that nothing in
  `src/` or `tools/` outside the look test imports `src/deep/`.
- Browser: `scenario deep-look` passed on private ports with zero errors and
  zero warnings (the first run caught a missing favicon on the new page; fixed).
- Lane gate (`--tier lane --changed --jobs 4 --keep-going`, run alone): 388
  suites passed, 1 failed. The failure was `test-preview-launcher`, which
  requires every dev switch to be in `start-preview.bat`'s PREVIEW_FLAGS; I added
  `the-deep` there (harmless, nothing reads it) and that suite now passes
  (23 of 23). I reran that suite, not the whole gate. `npm run build` passes.

## Changed assertions (reviewed)

Adding a switch changes three existing checks, each by exactly the new switch:

- `tools/test-feature-flags.mjs`: the catalogue count 21 becomes 22 and
  `the-deep` joins the list of switches that must be `dev`.
- `tools/test-wasteland-beta.mjs`: the full catalogue comparison gains
  `'the-deep': 'dev'`.
- `start-preview.bat` (not an assertion): `the-deep` added to PREVIEW_FLAGS so
  `test-preview-launcher` keeps requiring every dev switch.
- `tools/test-repo-hygiene.mjs`: the review-sheet rule accepts `look-N.jpg`
  beside `round-N.jpg` in `docs/board/looks/<family>/`; `test-repo-hygiene-rules.mjs`
  gains one case for it. No check was loosened for any other file.

No race rule, fingerprint, replay, save or game file changed.

## Removed

Nothing is replaced, so nothing is removed. New files only, plus one page added
to the QA build list. The raw captures under `.evidence/` are deleted now the
sheet is committed.

## Left for later

- D4 turns this into the real zone: denser seagrass, better rocks, richer kelp,
  warm-up for first-frame shaders, and a frame budget that keeps High at 1.6
  under about 14 ms of GPU time.
- `tools/repo-audit.mjs` will list `src/deep/` as "nothing imports it" until D4
  imports it from the zone; that is expected for a look test.
