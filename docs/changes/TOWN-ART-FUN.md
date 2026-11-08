# TOWN-ART-FUN change note

## Changed

- Replaced the two rough stall shapes with separate 1×1 market stalls: a hit-the-can stall with a shelf and stacked cans, and a sweets stall with individual jars. The existing accepted buildings stay in the family.
- Added eight 1024 px JPG reference files and their image-generation credit in `public/assets/models/wasteland/town/textures/`.
- Added a round 20 sheet with four photo/model pairs per stall and both three-quarter views plus the mayor view.
- Family GLB is 4,529,236 bytes. The build printed every piece's bounds and checked footprint, ground/contact and triangles. Stall A: 1,080 triangles; stall B: 1,500 triangles.

## Checks

- Blender family export: passed; generated `public/assets/models/wasteland/town/fun.glb`.
- Imported-GLB stall renders: completed for side, front, rear, overhead, two three-quarter views and mayor view for each stall. Reviewed beside the source photos. The likeness verdict is 2/5; see the round 20 review. This is a candidate, and Claude should inspect the awning geometry and inconsistent reference views.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failures.
- Browser, in-game and frame checks: not run; Claude owns those checks for this art card.
- Changed assertions: none.
- Race fingerprints: not applicable; no race logic changed.

## Removed

- Replaced only the previous placeholder geometry for `fun-stall-a` and `fun-stall-b`. No other building or prior review sheet was removed.

