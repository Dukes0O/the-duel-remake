# WW-ART-BONEYARD — Round 2

The recipe now builds a round, open ended aircraft hull with visible ribs, tapered torn wings, hanging flaps, and a swept tail. The deck sits on the dirt. Grey aluminium and faded enamel carry patchy wear; rust is limited to steel repairs and welds, with soot around the engines. A review-only yard car provides scale and is excluded from the GLB. No art-library donor or external credit was used.

The previous round 1 sheet and note were replaced by a compressed comparison sheet and round 2 review. The sheet includes a car-height approach from about 40 m, a three-quarter yard view, the interior drive-through, and close wing repairs. The round 1 images are not exact matched camera views; the sheet labels the new approach as unmatched.

## Checks

- Blender 4.5 round 2 export: passed. Authored geometry: 30,349 triangles; GLB: 1,963,868 bytes.
- GLB readback: passed. 30,349 triangles, 1,963,868 bytes, 55 nodes, the `Scablands Boneyard` root, and all 18 named fuselage, wing, tail, engine, cockpit and landing gear groups; both card budgets pass (45,000 triangles; 2,000,000 bytes).
- `node tools/test-blender-output.mjs`: passed, 192 checks, 0 failed.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 46 passed, 2 failed, 0 not run. `tools/test-circuit-eifel.mjs` and `tools/test-review-evidence.mjs` each failed again on the one allowed same-commit rerun because this lane cannot launch FFmpeg (`FFmpeg loudness measurement failed`; `spawnSync ffmpeg EPERM`). The replay guard passed 297 checks across 33 cases, 31 events, 9 categories and three frame rates. `tools/test-repo-hygiene.mjs` passed.
- `npm.cmd run build`: passed. Existing dynamic-import and large-chunk warnings remain.
- Browser and game look checks: Claude runs. Please review the four views on the sheet, especially tail readability at distance, the ribbed 5.1 m clear tunnel, and whether the low wings read as torn welded jump ramps. In-game vehicle clearance belongs to WW-SCENE.
- Frame checks: not run; this is art work.
- Changed assertions: none. The blender-output registration now requests round 2; no assertion changed.
- Race fingerprints: none expected for this art-only change; the lane replay guard passed with 297 checks across 33 cases, 31 events, 9 categories and three frame rates.

## Removed

Replaced the round 1 review sheet and note in `docs/board/looks/ww-art-boneyard/` with the round 2 comparison and note. The temporary review car is removed before saving the Blender source and exporting the GLB. The previous model is overwritten by the round 2 model; no duplicate model was kept.
