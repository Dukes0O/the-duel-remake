# TOWN-ART-PLANTS round 3

## Changed
- Added generated crusher reference views and 1024 px measured crops with grids and a credit note.
- Replaced the old beam-built conveyor lattice with a side-photo trace and slab. The lattice holes remain open. Retained separate `crusher:belt` and `crusher:jaw` groups and replaced the scattered gravel spheres with a separate cone.
- Exported `public/assets/models/wasteland/town/plants.glb` (1,021,000 bytes) and added the round 3 comparison sheet and review.

The crusher does not meet acceptance. The body remains box-built instead of carved with `carve_hull`; the traced belt has a white photo-background patch and the supports do not join cleanly; gravel is not photo-derived. The other seven family items are not built. The review records a fail and asks Claude to judge this partial round.

## Checks
- `node tools/test-blender-output.mjs`: passed, 304 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; no placement failures.
- Blender export and reimport/render completed. The visual review failed as detailed above.
- Browser/look checks: not run here. Claude should inspect the crusher sheet and GLB, especially side silhouette, white patch, support joins, `crusher:jaw` pivot and `crusher:belt` openings.
- Changed assertions: none.
- Race fingerprints: not applicable to this art-only change.

## Removed
- Removed the round 2 sheet and review after replacing that evidence with round 3.
- Removed the old extended box-and-beam conveyor code and old gravel-sphere recipe where replaced. The prior box-built hopper/body remains and is called out as unfinished.
- Removed temporary Blender renders and check logs from `.qa-dist` after recording their results.
