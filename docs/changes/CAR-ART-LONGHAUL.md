# CAR-ART-LONGHAUL

## Changed

- Rebuilt `tools/blender/longhaul.py` from the generated photo target, using measured proportions and a low three-quarter view at about 1.7 m eye height.
- Replaced the first candidate in `public/assets/models/wasteland/cars/longhaul.glb`. The exported model has 24,676 triangles and is 1,878,576 bytes.
- Added `longhaul-rusted-paint.jpg`, `longhaul-dusty-rubber.jpg` and their prompt/credit record under `public/assets/models/wasteland/cars/textures/`.
- Added the round-2 matched-scale photo/model sheet and self-review at `docs/board/looks/car-art-longhaul/round-2.jpg` and `round-2-review.md`. The sheet is 216,903 bytes.

## Checks

- `node tools/test-blender-output.mjs`: passed, 232 checks.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement is valid. Size totals are advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed; 433 checks were reported. The audio-analysis subtest failed on the known `spawnSync ffmpeg EPERM` environment error.
- No lane tier or build was run, per the art-card instructions.
- No browser, frame or in-game look check was run. Claude should review the matched photo/model view, truck proportions, texture scale, cab glass, tire tread, rack connections and person scale.
- Changed assertions: none.
- Race fingerprints: unchanged; no simulation or race code changed.

## Removed

- Replaced the round-1 Longhaul model and recipe geometry in place. Removed its broad smoothed shell, flat color/noise material treatment, and separate block tread lugs. No backup model was kept.
