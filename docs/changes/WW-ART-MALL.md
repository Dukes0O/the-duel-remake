# WW-ART-MALL

## Changed

- Added `tools/blender/scablands-mall.py`: an open-roof, half-buried mall shell with welded steel, rust, invented shop signs, a stuck escalator, sand drifts, named Ash Men lamps and a named heist route.
- Registered the Blender-free output plan in `tools/test-blender-output.mjs`. The recipe keeps its editable `.blend` in ignored `art-build/`; it does not publish a runtime GLB because WW-SCENE owns installation.
- Rendered the one requested art round. The comparison sheet is `docs/board/looks/ww-art-mall/round-1.jpg` (72,506 bytes), with the builder’s scores and review request in `docs/board/looks/ww-art-mall/round-1.md`.
- The temporary candidate GLB measured 12,208 triangles and 611,812 bytes, within the 50,000 triangle / 2 MB limits. It was removed after inspection and is not committed.

## Checks

- Blender build and four review renders: completed after correcting an unsupported Blender view-look name. One first invocation stopped before rendering; the corrected invocation completed round 1.
- `node tools/test-blender-output.mjs`: 192 checks passed. Two early attempts exposed recipe planning issues (Blender import before `--paths-only`, then incorrectly marking a recipe with an editable source as `recipeOnly`); both were corrected before the green run.
- Lane tier: 25 suites passed, 1 failed, 0 not run. `tools/test-review-evidence.mjs` failed twice: its crew path assertion compares the fixed 4 November date with the current 5 November date, and its audio-analysis case received `spawnSync ffmpeg EPERM`. Seven of nine subtests passed on the rerun. No assertion changed.
- `npm.cmd run build`: passed. Vite reported existing chunk-size and dynamic-import warnings.
- Browser scenario and in-game look check: Claude runs. Claude should review the round-one sheet for exterior silhouette, interior readability, material wear and whether the camera framing proves the open-roof design. Builder scores are deliberately low; the views mostly show undersides.
- Frames: not applicable to art. Race fingerprints: not applicable; no simulation or course code changed.

## Removed

- Removed the temporary `public/assets/models/wasteland/scablands/mall.glb` after budget inspection. WW-SCENE will generate/install it when the game loads it.
- No prior source, test or asset was replaced.
