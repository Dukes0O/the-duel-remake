# TOWN-ART-FOOD: goat pen, round 19

Task: TOWN-ART-FOOD
Status: model and sheet ready for Claude's art verdict.
Kind: art
Flag: none; this family is not wired into the game in this card.

## Design and changes

- Replaced the four goat-pen references with front, side, rear and overhead views of one square weathered pallet pen. Added four shelter-only views and a separate fence-panel photo with plain grey visible through its gaps.
- Replaced the box-built fence with four traced slab runs using colour-masked, open gaps. Carved the timber shelter from its four photos and traced the trough from the pen's overhead photo.
- Left the chicken run source and model recipe unchanged.
- Fixed the photo/model orientation mismatch found on round 18: the shelter now matches the front, side and rear references; the side and overhead review cameras face the same directions as their photos; the plan-mapped trough keeps its photographed side.
- Round 19 sheet: 1200 × 2380 pixels, 292,617 bytes. It compares four source/model camera pairs and shows the model in three-quarter and mayor views.
- Exported family: 2,941,856 bytes and 29,492 triangles total. Goat pen: 3,512 triangles, within its 5,000 plot limit.

## Checks

- Blender 4.5.13 export: passed. The first export showed the shelter 14 cm above ground; the source placement was lowered. A later output check measured 30,790 family triangles; the shelter carve target was reduced while keeping it photo-carved. Round 19 keeps the goat pen within its 5,000-triangle plot limit.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement passed and size targets remain advisory.
- `node tools/test-review-evidence.mjs`: final run passed 8 of 9 subtests, including the retained JPG/review-note check. Audio analysis could not start FFmpeg (`spawnSync ffmpeg EPERM`). No assertions or tolerances changed.
- Lane tier: 13 suites passed; `tools/test-circuit-eifel.mjs` failed and the remaining 33 did not run. Its one same-commit rerun passed 17 of 18 checks and failed the Eifel loudness check because FFmpeg could not start (`spawnSync ffmpeg EPERM`).
- `npm.cmd run build`: passed.
- Added readback checks for the four fence runs, shelter and trough. No existing assertion or tolerance was changed or loosened.
- No browser check or look verdict was run here. Claude should review the six panels listed in `docs/board/looks/town-art-food/round-19-review.md`, especially shelter and trough placement, open fence gaps, photo/model matches and mayor scale.
- No race fingerprint applies; this art is not wired into the game.

## Removed

- Removed the former box-built goat fence, gate, shelter and trough from the Blender recipe.
- Replaced the round-18 goat-pen candidate in `food.glb`; both round-18 and round-19 comparison sheets remain as round evidence.
