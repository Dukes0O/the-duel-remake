# TOWN-ART-WALKERS

## Changed

- Added the thirteen named town people as one GLB family, with separate swing-leg nodes. Coats, workwear, hats, trader pack and Vane's blue mark use the existing town picture tiles.
- Added GLB readback checks for family names, leg pivots, texture coordinates, per-person triangle limits and the 1 MB file limit.
- Submitted one comparison sheet and a scored visual review. The review calls out the remaining difference from the photo for Claude's look verdict.

## Checks

- Blender export and three review renders: passed. Each view came from the exported GLB imported into an empty scene.
- `node tools/test-blender-output.mjs`: 254 checks passed.
- `node tools/test-repo-hygiene.mjs`: passed. Existing repository size target overages are advisory.
- `node tools/test-review-evidence.mjs`: 7 passed, 2 failed; rerun reproduced both. One existing date-path assertion expects `2026-11-05` while the shared planner now returns `2026-11-06`. The other failed because the environment denied `ffmpeg` with `EPERM`. No assertions were changed to work around these failures.
- Browser and game look checks: not run here. This art is not wired into the game. Claude should review `docs/board/looks/town-art-walkers/round-1.jpg` and the proportion and outfit notes beside it.
- Race fingerprints: none; no race or simulation code changed.

## Changed assertions

Added output assertions for this family. No existing assertion was changed.

## Removed

- No tracked predecessor or shared asset was removed.
- Blender scene, raw render images and test logs are temporary lane outputs and will be deleted before commit.
