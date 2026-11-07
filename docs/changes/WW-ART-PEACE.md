# WW-ART-PEACE round 3

## Vehicle photo sources — incomplete work in progress

Generated and cropped four-view photo references for `sal-pipe-trailer`,
`dust-tanker` and `mirage-caravan`. Added the twelve JPEG sources to the town
texture folder and credited them. Each image is under 1024 px on its long side.

This does not complete the vehicle card. The Blender recipe has not yet been
extended, the vehicles have not been modeled or rendered, and no round-4 sheet
has been assembled. Claude should not review these photos as a finished round.

Checks run: `node tools/test-blender-output.mjs` passed (304 checks, 0 failed);
`node tools/test-repo-hygiene.mjs` passed. No test assertions changed. Race
fingerprints: not applicable; no simulation code changed. Browser and look
checks: not run here; Claude should judge the vehicles after the model and
round-4 sheet exist.

The requested `docs/ART_LINE.md` was not present in this checkout; the current
hull and photo method was read from the end of `docs/ASSET_PIPELINE.md`.

### Removed

- No files or behavior removed.

## Round 5 work in progress

### 1. Full-size images and review renders

The Sal vehicle photos now stay at their authored sizes in the exported GLB;
the side is 1024 pixels wide and the other views remain at their full source
sizes. Each raw review render is at least 1200 pixels wide. The output limit
for this card is 3 MiB, up from 2 MiB, to allow the four unshrunk vehicle
photos while keeping the rest of the existing props intact.

Checks: not run yet; the final two named checks will run after the remaining
vehicle fixes. Blender export and the full-size GLB measurement are pending.
Assertions changed: only the card's maximum file size, increased by exactly
1 MiB; no threshold was lowered. Browser/look checks are for Claude; the
round-5 sheet will show the imported GLB from the side and both three-quarter
views. Race fingerprints: not applicable.

### Removed

- Removed the four Sal-only embedded image downscales; full source photos now
  feed the vehicle material.

Added the `toll-cabinet` root with a traced front photo, steel case and a real
projecting open-drawer box. The cabinet stands 1.8 m high. Its generated front
and side photos are compressed to JPGs in the town texture folder and credited.

Added the `bound-sign` root as a traced, thick board and a separate post. The
render keeps the three hand-painted lines right-reading and spelled exactly
`DO NOT DIG HERE`.

Added the `bound-stone` root, carved to 1 m from the front and side photos. Its
front carries a shallow crossed-tools mark with a smiley. The full-size JPGs are
kept as sources; only these new photos are downsampled in Blender for the GLB.

Added `mirage-decoy-tent` with a large painted front, a smaller offset rear
board and support poles hidden behind the painting. Its exported side view
shows both flat boards. The painting and exported front were compared at the
same size.

Added `mirage-decoy-oasis` with a traced thin tarp, four lifted corner folds,
stakes and guy lines. Its palm is hand-painted on the blue tarp. The overhead
photo was compared to the exported overhead render, and the car-height view
shows the full sheet from about 10 m away.

## Checks

- Blender export and GLB re-import/render results are recorded under each
  round below.
- The art lane does not run browser or in-game look checks; Claude reviews each
  submitted sheet.
- Added named-root and named-part assertions to the existing Blender candidate
  check. No existing assertion was weakened or removed. Race fingerprints are
  not applicable; no race rules changed.

## Removed

- No files or behavior removed.

## Round 3

Five flat props pass; see `docs/board/looks/ww-art-peace/round-3-review.md`. Removed: nothing.

## Round 4 partial: Sal's pipe trailer

Added only `sal-pipe-trailer`, using the committed four-view photos. Its pickup body is carved from the side, front, rear and overhead views. The separate trailer has a sagging photo-kit frame, a box carrying the photographed pipe stack and bright cut ends, and lathed wheels. The source photographs were not changed. The previous nine props and round-3 sheet remain in place.

The exported `peace-props.glb` was re-imported into an empty Blender scene for the side and two three-quarter renders. The comparison sheet is `docs/board/looks/ww-art-peace/round-4.jpg` (1600 by 788 pixels, 67,793 bytes). Readback: 24,352 triangles and 1,994,940 bytes, within the 40,000-triangle and 2,000,000-byte budgets.

Checks run: Blender export, GLB re-import and three review renders succeeded; `node tools/test-blender-output.mjs` passed (304 checks, 0 failed); `node tools/test-repo-hygiene.mjs` passed. The test added named-root and named-part assertions for the new vehicle; no assertion was changed or removed. Browser checks and in-game look checks were not run here; Claude should judge the sheet, with attention to the simplified trailer tires and flatter photo-box sides. Race fingerprints: not applicable; no simulation files changed.

### Removed

- No files or behavior removed.
