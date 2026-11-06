# TOWN-ART-WATER change note

## Design

Built the six waterworks models from the card layout and matched the site to the desert waterworks reference. The recipe now reads checked-in source images for corrugated galvanized steel, limestone, and the site reference. The steel and limestone are packed into the shared 1K atlas. Corrected the tower support footprint, rotated the hand crank and pump flywheel, enclosed the pump shed, reversed the treatment process for the road-side view, and modeled the settling and sand-filter stages as open basins. The reservoir remains a flat movable scoop surface.

## Review

`docs/board/looks/town-art-water/round-1.jpg` is within the 500 KB limit. Self-review is 3/5 for silhouette/readability, 4/5 for materials, and 3/5 for scale/site composition. This is not a look pass: the model still reads too low-poly beside the photo reference, most clearly at the well, standpipe, and treatment process. Claude should review the sheet and decide the next art step. No browser or Chrome checks were run; Claude owns those checks.

## Checks

- `tools/test-blender-output.mjs`: pending.
- `tools/test-repo-hygiene.mjs`: pending.
- `tools/test-review-evidence.mjs`: pending.
- Blender 4.5.13 rebuild and eight evidence renders: passed on retry. One prior attempt failed during EEVEE shader allocation with an out-of-memory error; retry succeeded without source changes.
- No game code, race behavior, assertions, or fingerprints changed.

## Removed

Removed the donor import and replacement path that deleted the authored meshes and overlaid mis-scaled donor parts. Removed no existing player assets or saves.
