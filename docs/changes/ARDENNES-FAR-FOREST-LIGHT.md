---
task: ARDENNES-FAR-FOREST-LIGHT
status: ready-for-review
player_facing: yes
---

# ARDENNES-FAR-FOREST-LIGHT: the wooded hills back on Ardennes, at a lighter cost

The far band (2,182 firs, 60 to 220 m from the road) was taken out of Ardennes on
16 October because High missed the frame limit at Pit Straight (p95 33.3 ms
against 18.5 ms; Performance 16.8 ms either way). This card finds why and puts
the band back with a cost the check can accept.

## Why the band cost so much (counted, not timed)

Headless render of Ardennes at Pit Straight, eight cars, the countdown view the
frame check uses (software graphics: counts only, no timing):

| High | draw calls | triangles | shadow pass (calls / triangles) | shadow casters |
|---|---|---|---|---|
| no band (live now) | 1,734 | 3,068,511 | 476 / 762,510 | 802 |
| old band | 1,746 | 3,389,055 (+10.4%) | 476 / 869,214 (+14%) | 872 |
| light band (this card) | 1,739 | 3,126,723 (+1.9%) | 476 / 762,510 (+0) | 802 |

Performance shows the same added counts (old band +309,852 triangles, +13.9%;
light band +58,212, +2.6%).

- Each far fir was a full fir: 648 triangles in the crown plus 36 in the trunk, 684
  in all, 2,182 of them. Far firs were also planted into the first band's own
  200 m cells (all 61 of them gained some), so a cell in view drew all its far
  firs even when they were off screen.
- Every far fir sat in a cell the sun's shadow box touches, so the shadow pass drew
  about 107,000 extra triangles of firs that are 60 m or more from the road, far
  outside the box's 45 m reach, and none of them can shed a visible shadow.
- Why High and not Performance: the added counts are the same on both. High's
  frame was already at one display refresh (16.8 ms); a heavier frame then falls
  to the next refresh, which is the 33.3 ms. Performance lowers its own picture
  size when frames run slow (adaptive resolution, down to 80%), so it absorbs the
  same load and still delivers 16.8 ms. This is inferred from the counts and the
  earlier frame numbers; no timing was run here (the Director runs the frame check).

## What changed

- `src/vegetation.js`: far firs (`tree.farForest`) now have their own meshes:
  one light crown (`farPineCrown`: 98 cards, 196 triangles, the same bough
  texture and material as the near fir, the same outline within 7%, no trunk),
  cells of 400 m (`FAR_PINE_CELL_SIZE`) so a view draws a few big groups, and
  `castShadow = false`. First-band trees are cut into exactly the cells and
  meshes they had before the far band existed (checked in the test). Autumn
  tints, tree falls and the beech set work as before.
- `src/circuits/ardennes-forest.js`: the `farForest` entry is back, the accepted
  values unchanged (60 to 220 m, spacing 9, 5 rows, thin .5, scale 1.4 to 2.6, groves).
- `tools/test-circuit-ardennes.mjs`: see tests below.

The first band (9,131 trees) and the 191 beeches are unchanged, and no other
course is touched.

## Numbers

- Trees 9,131 + 2,182 = 11,313, the same far band as round 1.
- World signature, Ardennes only (NOT recaptured; Claude recaptures after judging
  the sheet): instances 36,465 to 38,647 (+2,182: one crown per far tree, no trunk),
  meshes 1,244 to 1,274 and nodes 1,303 to 1,333 (+30 far cells), geometries 249
  to 250 (the light crown), materials 156 and textures 84 unchanged. New hash
  c0b5bca3. `test-world-composition` fails on this row until recaptured; the other
  45 checks pass exactly (run with Ardennes skipped in a scratch copy).
- The far firs draw in 30 meshes in all; about 5 are in view from the grid.

## Pictures

`docs/board/looks/ardennes-far-forest/round-2.jpg` and its review note: no band,
old full-detail band, light band at La Fontaine, Les Combes and Stavelot (High).
This is round 2 of the band's art; no further art round is needed unless the
sheet is rejected.

## Tests

- `tools/test-circuit-ardennes.mjs` (48 tests pass):
  - Changed assertion, for Claude's rule 18 review: "Ardennes ships without the
    far band" (the band's absence, 9,131 trees) becomes "Ardennes ships the accepted
    far band" (its exact values, 2,182 far trees, 9,131 + 2,182). The old
    assertion is kept as it was, on the course with the band removed
    (`ARDENNES_NO_FAR`), so nothing is loosened.
  - The band tests now build the shipped Ardennes against the same course minus
    the band (before: the other way round). Same checks, same band.
  - Changed assertion in the beech world test: "trunk meshes plus beeches equal
    all trees" became "trunk meshes plus far-fir meshes plus beeches equal all
    trees" (far firs have no trunk mesh), plus a check that no far fir is a beech.
    Stronger, not weaker.
  - New: far firs drawn by light meshes; the first-band meshes and every instance
    matrix are identical with and without the band; every far fir is drawn once at
    its place and scale; no shadow casting; at most 40 far meshes; the light crown
    has the near crown's outline within 8% and at most a third of its triangles.
- `tools/test-circuits.mjs` passes. `tools/test-world-composition.mjs`: the
  Ardennes row differs as stated above.

## Frame check

Not run here. Claude runs it with the laptop screen off.

## Removed

Nothing; the band's earlier removal on Ardennes is undone.

## Finish run, 28 October 2026 (overnight helper for Claude)

- Merged `integration/wasteland` (4aa2c71c) into this branch with no conflicts
  (merge commit 6a1ea02d). The new terrain preload (`src/terrain-preload.js`,
  `render3d.js`, `world.js`, `world-surfaces.js`) does not touch the far band:
  the far firs sit on the drawn ground height as before, and the native Ardennes
  views below show the band in place with the preload in the build.
- Pictures for Claude's look (High, same cameras, car, seed 1989 and field seed
  as `tools/scenarios/ardennes-views.mjs`), before = integration 4aa2c71c, after =
  this lane, in the integration folder's
  `.evidence/2026-10-28/ARDENNES-FAR-FOREST-LIGHT/`: `before/`, `after/`,
  and `before-after-sheet.jpg` (rows: Pit Straight, La Fontaine, Les Combes,
  Stavelot; left before, right after). Both runs finished the full two-lap
  field with 0 browser errors. No frame timing was taken.
- World signature, Ardennes only, NOT recaptured (captured with
  `node tools/test-world-composition.mjs --capture`; 22 other rows identical to
  their fixtures): hash 2e8e6311...bbf173 to 13d1c78c...5204 (full values in
  the evidence folder, `world-signature-compare.txt`), nodes 1,303 to 1,333,
  meshes 1,244 to 1,274, instances 36,468 to 38,650, geometries 249 to 250,
  materials 156 and textures 84 unchanged. The earlier figure c0b5bca3 in this
  note was from before the merge; the integration changes since moved the
  baseline by 3 instances, so use these numbers.
- One more changed assertion, for Claude's rule 18 review: in
  `tools/test-expansion-vegetation-grounding.mjs` the Ardennes check "every
  remaining legacy pine cell keeps exactly two draws" counted far firs as two
  draws each. It now counts first-band cells at two draws and far firs at one
  draw per 400 m far cell (the same rule as in `test-circuit-ardennes.mjs`), and
  a new check confirms no beech or duplicate is drawn as a far fir. Nothing is
  loosened: the first-band count is unchanged and the far count is exact.
- Gates: lane tier `--changed --jobs 4 --keep-going`: 68 passed, 1 failed, 0 not
  run. The one failure is `tools/test-world-composition.mjs`, on the Ardennes
  row only, waiting for Claude to grant the new signature. `npm run build`
  passes (output deleted). Replay fingerprints unchanged.
