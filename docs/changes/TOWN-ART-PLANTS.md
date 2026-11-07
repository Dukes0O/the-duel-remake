# TOWN-ART-PLANTS - wellhead - round 9 follow-up

## Changed

- Replaced the flood-only side-photo mask with a global neutral-grey color mask. The A-frame openings and the gap under the beam are cut wherever the studio grey appears.
- Replaced the smooth motor lathe with a traced motor slab wearing the side photo. Corrected the casing, valve and handwheel photo mapping and placed the valve wheel beside the casing.
- Kept the beam, horse-head, A-frame, base and flywheel from round 8. The wellhead uses 1,716 triangles, below its 1,800 limit.
- Reused only byte-identical embedded photos (none were duplicates) and resampled embedded photo copies to 85% to bring the family GLB under its 3 MB budget. The original source photos are unchanged. The family GLB is 2,514,888 bytes.
- Added the round-9 sheet (205,601 bytes) and review note. Rounds 6 and 7 remain.

## Checks

- Blender recipe, GLB export and exported-model renders: passed. The side mask was inspected beside its photo; the frame gaps are black.
- `node tools/test-blender-output.mjs`: passed, 377 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; placement is clean and size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed, including the round-9 sheet check. The audio-analysis subtest failed on `spawnSync ffmpeg EPERM`; its one rerun failed the same way.
- Lane tier and build: not run; art-card instructions exclude them.
- Browser and in-game look checks: not run; Claude owns them. Claude should inspect the side mask and open frame, motor photo match, dark rusty casing and valve, readable `07`, and mayor view.
- Changed assertions: none. Race fingerprints: not applicable; no race code changed.

## Removed

- Removed the former generic motor lathe and the round-8 sheet and note, as requested.
- No source reference photo or accepted building was removed. Temporary renders, masks, sheet scripts and logs are removed after checks.
