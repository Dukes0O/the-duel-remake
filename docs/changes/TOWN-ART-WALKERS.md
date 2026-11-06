# TOWN-ART-WALKERS

## Status

Round 3 candidate; awaiting Claude's art pick and a green lane gate.

## Design settled

Use a single lightweight GLB family with one root and thirteen named direct children. Carve each figure from its own measured four-view outfit photos so color, cloth and silhouette vary by person while the triangle budget stays low. Keep each leg as a separate named child for later movement. Add only the guard's rifle, trader's pack and Vane's blue drop as separate details. The family must remain usable as a 200-person crowd, so keep one shared small atlas and stay under 450 triangles per figure and 1 MB for the GLB.

## Evidence

- Round 3 comparison sheet and provisional assessment: `docs/board/looks/town-art-walkers/round-3.jpg` and `round-3-review.md`.
- Round 3 looks clearer than round 2: each named outfit now has its own photo silhouette and fabric color, and the lineup and 40-person view show variation. Codex recommends pass; final art selection belongs to Claude.
- `node tools/test-blender-output.mjs`: passed, 296 checks. The first run caught a mismatched trader-pack node name; the recipe and GLB were corrected, and the rerun passed.
- `node tools/test-repo-hygiene.mjs`: passed. The reported size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed; the audio analysis subtest failed twice with `spawnSync ffmpeg EPERM`. This tool-launch failure is unrelated to the walker files.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: stopped after 13 suites passed and `tools/test-circuit-eifel.mjs` failed; 33 suites did not run. The one-suite rerun failed again while Three.js could not load `blob:nodedata:` textures. This test is unrelated to the walker files.
- `npm.cmd run build`: passed. Vite reported existing chunk-size and dynamic-import warnings.
- No art frame check or browser scenario applies. No tests or assertions were changed.

## Removed

- Removed the repeated donor-photo mappings for walkers D–H, kid B, guard and trader; each now uses its own measured photo set.
- Removed diagnostic mask and voxel logging from the Blender recipe.
- Removed the obsolete synthetic color palette after each named outfit moved to its own photo set.
- Removed the guard's single-material rifle details in favor of distinct leather sling, wood and steel parts.
- Removed the synthetic white bib overlay from Vane; her white overalls now come from the dedicated Vane photo set.
