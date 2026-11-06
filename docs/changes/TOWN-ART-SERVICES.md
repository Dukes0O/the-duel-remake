# TOWN-ART-SERVICES

## Changed

- Added the `town-services` Blender recipe and `services.glb` with all twelve named buildings. The Town Hall is the first detailed piece; the rest are family blockouts.
- Added one 512 × 512 generated brick texture for the Hall, with its prompt in `CREDITS.md` and `docs/WASTELAND_ART.md`.
- Added one round-1 photo/GLB comparison sheet and an honest self-review under `docs/board/looks/town-art-services/`.
- Added the Blender output registration and checks for all required ids, the separate family children, per-footprint triangle budgets, one UV channel, the file-size limit, and the metallic cap.

## Checks

- Blender 4.5.13 recipe and exported-GLB renders: passed. The Hall renders from the re-imported GLB in an empty scene. Final family output is 2,587,280 bytes.
- `node tools/test-blender-output.mjs`: passed, 276 checks, 0 failed. Its first runs exposed the Hall and radio-mast triangle overages and the exported 0.3 metallic rounding; the recipe was corrected to meet the existing budgets and cap. No assertion was weakened.
- `node tools/test-repo-hygiene.mjs`: passed. Existing advisory size targets remain unchanged.
- `node tools/test-review-evidence.mjs`: 8 passed, 1 failed; same-commit rerun reproduced `spawnSync ffmpeg EPERM` in the audio-analysis subtest. The other review JPG, evidence-path, and manifest checks passed both runs.
- Browser / in-game look check: not run in this lane. Claude should judge the round-1 comparison sheet and later inspect the town-hall and family GLB in the town scene.
- Changed assertions: added the TOWN-ART-SERVICES GLB contract check. No existing assertion changed.
- Race fingerprints: not applicable; the card changes only art recipes, art assets, and their output check.

## Removed

- Removed the duplicate mast cross-ties and one excess mast lattice level to meet the 1×1 plot budget.
- Removed a redundant clock rim after the Hall exceeded its 3×3 plot budget. Existing checks were not relaxed.
- Deleted local render logs, temporary renders, the rebuildable `.blend`, and Python bytecode before handoff.

## Claude review

The sheet self-review scores resemblance 3/5 and detail 2/5; this is a first-round candidate, not an art pass. The Hall geometry and brick/tin materials are in place, but the wear, roof repairs, and small-scale family buildings need review. The sheet is under the 500 KB limit (242,191 bytes).
