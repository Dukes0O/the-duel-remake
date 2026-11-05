# WW-ART-VEHICLES

## Changed

- Added irregular cab and body repair plates, raised weld beads, gas tank plumbing and valve, furnace flank vents with separate dark mouths and glow inserts, and a sparse buggy frame.
- Fixed child parenting so each exported vehicle stays with its named root instead of stacking vehicle meshes at the origin.
- Replaced the round 1 review files with one compressed round comparison JPG and an honest round 2 score note. The JPG is 68,941 bytes.
- GLB readback: Big Bess 2,652 triangles; Old Smoke 4,320; thief buggy 992. Total file 521,280 bytes. All are under the per-vehicle 12,000 triangle and 1.5 MB file limits.

## Checks

- Blender 4.5.13 recipe render and GLB export: passed.
- `node tools/test-blender-output.mjs`: 192 checks passed.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement passed and size targets remain advisory.
- Changed-file lane tier (`--tier lane --changed --jobs 4 --keep-going`): 47 suites ran. Most passed. `test-circuit-eifel.mjs` and `test-review-evidence.mjs` failed in FFmpeg loudness/codec measurement; each was rerun once on unchanged game code and failed again. No assertions changed. The test runner process did not return after printing all suite results and was stopped after the summary had finished.
- `npm.cmd run build`: passed. Vite reported existing chunk-size and dynamic-import warnings.
- GLB budget and root readback: passed (three named roots; per-vehicle counts above).
- Browser and in-game look checks: Claude runs. No frame check was run.
- Race fingerprints: not applicable; no race simulation code changed.

## Claude review

Please inspect `docs/board/looks/ww-art-vehicles/round-2.jpg`. The note records the camera/ground presentation problem and missing scale reference honestly. No browser check or in-game look check was run in this lane.

## Assertions changed

None.

## Removed

- Replaced `round-1.jpg` and `round-1.md` with the round comparison sheet and `round-2.md`. The round 1 image is retained inside the new sheet.
- Replaced the previous `vehicles.glb` with the corrected round 2 export.
