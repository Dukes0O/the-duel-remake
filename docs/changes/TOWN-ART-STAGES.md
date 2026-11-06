# TOWN-ART-STAGES

## Changed

- Rebuilt `tools/blender/town-stages.py` to load generated timber, tin, charred wood and rubble material crops, use a reduced packed atlas and export JPEG texture data.
- Rebuilt `public/assets/models/wasteland/town/stages.glb` and added four compressed JPEG texture crops under `public/assets/models/wasteland/town/textures/`, with their prompts and credits in `CREDITS.md`.
- Added `round-2.jpg` and `round-2-review.md`. The comparison is marked fail; it shows only scaffold-2 and does not satisfy the card's all-id/two-view sheet requirement.

## Checks

- Blender recipe/render: completed; render inspected. It still fails the visual target.
- `node tools/test-blender-output.mjs`: failed its GLB byte budget (candidate is 3,012,624 bytes, 12,624 bytes over its 3,000,000-byte limit); ids and other checks ran.
- `node tools/test-repo-hygiene.mjs`: passed.
- `node tools/test-review-evidence.mjs`: 8/9 passed; known `spawnSync ffmpeg EPERM` in audio analysis.
- Browser/look checks: not run. Claude should inspect the scaffold thickness, real joints, deck, ladder and hoist; stage progression; burnt and rubble forms; street props; both camera views for every id; and the missing all-id sheet.
- Changed assertions: none. Race fingerprints: unchanged; no simulation code changed.

## Removed

- Removed the generated atlas source PNG after creating the committed compressed JPEG material crops.
- No existing game source or runtime asset was removed.

