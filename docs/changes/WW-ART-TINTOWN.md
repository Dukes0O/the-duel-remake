# WW-ART-TINTOWN

## Changed

- Added an original Blender recipe for Tin Town and its `tintown.glb` model.
- Added collision-named ground volumes for the main alley, cross alley and forge court; included three individually named lamps with lit and unlit meshes.
- Registered the recipe in `tools/test-blender-output.mjs` and added model, budget and named-node checks.
- Rendered round 1 to `.evidence/2026-11-04/WW-ART-TINTOWN/`. The compressed Blender comparison sheet and builder review are under `docs/board/looks/ww-art-tintown/`.
- Readback: 14,556 triangles and 1,028,808 bytes (limits: 60,000 triangles and 2,500,000 bytes).

## Checks

- Blender export and readback: passed at the stated budgets.
- `node tools/test-blender-output.mjs`: passed, 193 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed.
- Lane tier: all 48 suites started. 43 reported pass, two failed on FFmpeg permission/loudness errors, and `src/test.js`, `tools/test-test-runner.mjs` and `tools/test-track-kits.mjs` did not return. The runner made no progress for about ten minutes and was stopped. The required one-time reruns confirmed both FFmpeg failures: `tools/test-circuit-eifel.mjs` (17 passed, 1 failed at loudness measurement) and `tools/test-review-evidence.mjs` (8 passed, 1 failed at `spawnSync ffmpeg EPERM`).
- `npm.cmd run build`: passed; Vite built 632 modules. Existing chunk-size and dynamic-import warnings remain.
- Browser and in-game look checks: Claude runs these. The model is not wired into the game by this card.
- Changed assertions: none. Added assertions only for the new Tin Town asset contract.
- Race fingerprints: no simulation code or fixtures changed; replay suite reported 297 checks passed across 33 cases.

## Removed

- None.
