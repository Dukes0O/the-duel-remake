# TOWN-ART-MACHINES-2 — round 21

## Changed

- Reworked only the roller recipe: printed dimensions, calibrated the photo carve from the 1.30 m rear tyre, printed carve bounds, placed the rear tyres from the side photo's axle, and seated the 1.50 m by 1.80 m drum at ground level between the yoke arms.
- The 108 px rear-tyre radius gives 0.006019 m/px and a 3.491 m side silhouette, versus the card's rough 4.50 m estimate. The carved body measures 3.227 × 1.68 × 2.00 m; the separate canopy reaches 2.90 m. This mismatch is recorded for Claude rather than stretching the carve away from the tyre scale.
- Replaced the roller canopy's olive material with a flat worn-yellow photo-mapped roof on four posts. Updated the review cameras and reused the four round 20 references.
- Recorded the photo-carve axis lesson in `docs/ART_LINE.md`. Mixer truck, crane truck and pipe truck recipe code was unchanged.
- Added `round-21.jpg` (under 500 KB) and its visual review note.

## Checks

- Blender 4.5.13 completed the family export and rendered six roller views from the exported GLB. Model size: 5,857,096 bytes. The drum bounds reach 0.00 m at ground level.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed** on the final calibrated model.
- No lane tier, build, browser scenario or look test was run. Claude should inspect body continuity and seams, the source dimension mismatch, whole-machine framing, drum/yoke contact, canopy wear and the three unchanged trucks.
- Changed assertions: none. Race fingerprints: not applicable to this art change.

## Removed

- Removed the old olive material assignment from the roller canopy; no other family part was deleted.
