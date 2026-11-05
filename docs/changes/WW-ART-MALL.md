# WW-ART-MALL change note

## Changed

- Corrected the preview transform so the Y-up mall is shown upright in Blender and exported in game orientation.
- Added cracked floor tiles and visible broken-glass shards; enlarged invented signs; cleared the entrance sightline; kept the open roof, stuck escalator, sand and Ash Men's lamps.
- Reworked the daylight review cameras for the requested 40 m entrance, three-quarter exterior, on-foot escalator and close storefront views. Added a standing scale figure beside the escalator.
- Updated the Blender output plan and its test entry to name `public/assets/models/wasteland/scablands/mall.glb`.
- GLB readback: 1,049,760 bytes and 18,620 triangles (limits: 2 MB and 50,000 triangles). The published comparison sheet is 130,218 bytes.

## Checks

- Blender final renders and GLB export: passed. Rebuilt the sheet a second time using its embedded rounds 1-2 panel; the recipe no longer depends on the deleted round 2 file.
- `node tools/test-blender-output.mjs`: passed, 192 checks, 0 failed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`: 46 suites passed, 2 failed. `tools/test-circuit-eifel.mjs` failed at its FFmpeg loudness measurement (`FFmpeg loudness measurement failed`). `tools/test-review-evidence.mjs` failed to spawn FFmpeg (`spawnSync ffmpeg EPERM`). Both failures are unrelated to mall files.
- Same-commit reruns: `node tools/test-circuit-eifel.mjs` reproduced its FFmpeg loudness failure (17 passed, 1 failed); `node tools/test-review-evidence.mjs` reproduced `spawnSync ffmpeg EPERM` (8 passed, 1 failed). No assertions were changed.
- `npm.cmd run build`: passed. Vite reported its existing large-chunk and dynamic-import warnings.
- Browser check: not run here. Claude should inspect `docs/board/looks/ww-art-mall/round-3.jpg` and the entrance, escalator, three-quarter and close-shopfront source views. No frame check applies to art.
- Changed assertions: none. The Blender output test now checks the mall GLB path; no assertion was loosened.
- Race fingerprints: unchanged; no race or simulation files changed.

## Removed

- Replaced the round 2 published sheet with the final three-round comparison sheet and removed the superseded round 2 review note.
- No prior mall GLB existed on this lane; the generated model is now committed.
