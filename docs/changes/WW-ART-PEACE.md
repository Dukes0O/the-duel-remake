# WW-ART-PEACE

## Changed

Round 2 replaces the carved turret body with a photo-mapped turned dome, one turned barrel with a dark bore cap, and three turned bolts. The chair now uses traced side slabs on two planes, solid seat/back/footrest boxes, and a turned pedestal. The billboard and rock were left untouched. Added the round 2 comparison sheet.

The round is incomplete: the turret and chair still have visible three-quarter defects, and `toll-cabinet` and `bound-sign` were not built because generated reference images could not be transferred into the lane. See `docs/board/looks/ww-art-peace/round-2-review.md` for the honest visual verdict and next review points.

GLB readback: 20,928 triangles and 1,887,412 bytes. Round 2 sheet: `docs/board/looks/ww-art-peace/round-2.jpg`, 128,069 bytes.

## Checks

- Blender 4.5.13 recipe build and imported-GLB renders: completed; export was 1,887,412 bytes.
- `node tools/test-blender-output.mjs`: passed, 304 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- Browser check: not run; Claude should inspect the round 2 sheet, especially the turret bolts and chair cutout edges.
- Changed assertions: none.
- Race fingerprints: not applicable; this is art-only work.

## Removed

Removed the previous photo-carved turret body and chair hull/frame geometry from the recipe. No earlier runtime model or photo was removed. Temporary renders and check logs are cleaned from `.qa-dist` before handoff.
