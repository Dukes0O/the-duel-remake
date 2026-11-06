# TOWN-ART-MACHINES-2

## Changed

- Added the Blender recipe and exported `machines-2.glb` with the seven card machine roots and named articulated nodes. The loader has a wheeled articulated frame, twin hydraulic arms and a separate scoop bucket. Existing town machine wear, paint and tire pictures are reused.
- Added an exported-model comparison sheet and an honest self-review. Only the loader is rendered in rest and working poses for this first round.
- Added the machine family to `test-blender-output.mjs`.

## Checks

- Blender recipe: exported GLB and rendered loader poses from the imported GLB; GLB is 2,869,772 bytes (under 3 MB).
- `node tools/test-blender-output.mjs`: pass, 262 checks. Two earlier attempts failed on path-plan output; corrected the recipe path plan and reran the suite successfully.
- `node tools/test-repo-hygiene.mjs`: pass; repository placement passed, with existing size targets reported as advisory.
- `node tools/test-review-evidence.mjs`: 8/9 subtests passed; the audio-analysis subtest failed twice because `spawnSync ffmpeg` returned `EPERM` in this environment.
- Claude should judge `docs/board/looks/town-art-machines-2/round-1.jpg`. No browser check or frame check applies. No race fingerprints or assertions were changed.

## Review result

Not a visual pass. The imported render does not match the photographic loader: the arms, bucket, and tire-to-body relationship look distorted. Self-scores: proportions 1/5, construction 1/5, surface 2/5, pose 1/5, reference match 1/5. Correct local mesh and pivot transforms before refining or extending the family.

## Removed

Nothing. Existing assets and recipes were reused without replacement.
