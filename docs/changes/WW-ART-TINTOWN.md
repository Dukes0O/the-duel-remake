# WW-ART-TINTOWN — round 2

Status: round 2 recipe and model built; awaiting Claude's art verdict. Kind: art. Flag: `scablands`.

## Changed

- Reworked `tools/blender/scablands-tintown.py`: varied shack footprints and angles; pitched, overhanging roofs with corrugation and patches; added person-height doors and windows, exposed scaffold landings and ladders, irregular edge drifts, and a person for scale.
- Moved the cold forge into its court and framed its stack, hearth and anvil in a dedicated close view. Put the notice board at the entrance and aimed its paper toward the approach.
- Rebuilt `public/assets/models/wasteland/scablands/tintown.glb`: **20,412 triangles**, **1,447,572 bytes**, within the 60,000-triangle and 2.5 MB limits.
- Rendered car-height at 40 m, three-quarter and close forge views in `.evidence/2026-11-05/WW-ART-TINTOWN/`. Replaced the prior sheet with one round comparison JPG at `docs/board/looks/ww-art-tintown/round-1.jpg` (**135,425 bytes**). The score note is `round-2-review.md`.

## Checks

- Blender recipe and readback: passed; 20,412 triangles, 1,447,572 bytes.
- `node tools/test-blender-output.mjs`: passed, 193 checks.
- `node tools/test-repo-hygiene.mjs`: passed after the sheet replacement; repository placement passed and size targets remain advisory.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`: **46 of 48 suites passed**. `test-circuit-eifel.mjs` failed at FFmpeg loudness measurement. `test-review-evidence.mjs` first also found the previous sheet missing while the replacement was being made. After the sheet was put back at the same path with the combined comparison, its focused rerun passed the JPG path and size checks; its only remaining failure is `spawnSync ffmpeg EPERM`. The Eifel rerun failed again at FFmpeg loudness measurement. No game code or test assertions changed.
- `npm.cmd run build`: passed. Vite reported its existing dynamic-import and large-chunk warnings. `npm.ps1` was blocked by PowerShell execution policy before the build started.
- Replay guard: 297 checks passed across 33 cases, 31 events, nine categories and three FPS values.
- No browser check or frame check was run. The model is not wired into the game. Claude should judge the three full-size renders in the evidence folder.

## Assertion changes and race fingerprints

No assertions changed. Race behavior and fingerprints are unchanged; the replay guard passed.

## Removed

- Replaced the round-one JPG with the single comparison sheet and replaced its old review note with the combined round-two score note. No prior model path or test behavior was removed.
