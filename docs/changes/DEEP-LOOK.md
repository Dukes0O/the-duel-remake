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
| `sea-floor-shape.js` | Pure: the trail's depth (5 m shallows, level kelp forest, slope to about 30 m, still falling past the end), where kelp, seagrass, rocks and pebbles grow, how deep under the canopy a spot is, with hard caps (700, 3000, 120, 1500) |
| `sea-floor.js` | Rippled sand with patches and grit, instanced seagrass meadows in chunks, craggy faceted rocks, pebbles |
| `kelp.js` | Giant kelp: clumps of three stipes with ruffled blades and gas bulbs, a canopy, three levels of detail by distance, sway and flutter in the vertex shader, light through the blades, shadows that sway too |
| `contact-shadow.js` | A soft dark patch under a car so it sits on the sand |
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
the sand with headlights, six fixed views, and `window.__deepLook` for views.
`?quality=high|performance`; High uses the game's
composite pipeline (bloom, SMAA, 2048 shadows), Performance its direct one
(1024 shadows). `tools/scenarios/deep-look.mjs` takes the six pictures through
the browser harness and joins them;
`tools/vite-qa.config.js` gains the page so the harness serves it.

## Picture sheet

[`docs/board/looks/the-deep/look-2.jpg`](../board/looks/the-deep/look-2.jpg)
(405 KB) and its [review](../board/looks/the-deep/look-2-review.md). Recipe:
`node tools/browser-harness.mjs scenario deep-look`. Round one (look-1) was
replaced by round two in the same commit, one version of each file. Round two
answers Claude's seven notes: giant kelp with a canopy, colour by depth and
under kelp, clearer caustics (also on the paint), a grounded car, a richer sea
floor, soft headlight beams, silver fish flashes. Open points are in the review.

## Timing

None measured. Players cannot reach this look test, so under the testing rules
(AGENTS.md rule 9) timing comes when it is wired into the game. Round one's
frame-time measurement and its code (the in-page timer and the scenario's
measuring phase) were removed. New in round two: kelp is drawn in three levels
of detail (full, cheaper, not at all) and seagrass in chunks that are not drawn
when far, so D4 starts from a scene already built to be cheap at distance.

## Tests

- New `node tools/test-deep-look.mjs` (5,287 checks, picked up automatically by
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
  (23 of 23). Round two: lane gate 389 suites passed, 0 failed; `npm run build` passes.

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

Round two removed: the look-1 sheet and its note (replaced by look-2, one
version of each file); round one's single-stem kelp, round-one rocks and
headlight cone (replaced in place); the frame-measurement code and its
scenario phase (rule 9). Apart from the QA build list entry, files are new. The
raw captures under `.evidence/` are deleted now the sheet is committed.

## Left for later

- D4 turns this into the real zone: better rocks, warm-up for first-frame
  shaders (every shader compiles on the first frame), and timing once it is in
  the game.
- `tools/repo-audit.mjs` will list `src/deep/` as "nothing imports it" until D4
  imports it from the zone; that is expected for a look test.
