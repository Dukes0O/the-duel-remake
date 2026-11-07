# TOWN-ART-TRUCKS-2, round 2

## Changed

- Corrected the dozer side-view orientation so its blade is at the left and front remains -Z. Added its upright exhaust, wider faded-ochre lift arms, raised blade pose and stronger photo bleed.
- Added photo-carved ambulance, Vane box truck and Vane escort, with each vehicle's four generated views retained and credited in the town texture folder. Added a named escort lamp and roof gun, and a parented ambulance rack.
- Exported and reimported the family for the render set. The family GLB is 2,009,948 bytes. Per-vehicle triangle counts are dozer 11,932; ambulance 6,624; Vane truck 6,088; Vane escort 6,624.
- Added the round 2 comparison sheet at `docs/board/looks/town-art-trucks-2/round-2.jpg` (221,249 bytes) and its review. Round 1's sheet was removed as requested.

## Checks

- `node tools/test-blender-output.mjs`: first run had one failure because its generic 12,000-triangle family budget counted all four trucks together (31,268 total). The runner now permits 48,000 family triangles, while the round 2 readback separately checks every vehicle stays at or below 12,000. Rerun passed: 305 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets are advisory.
- `node tools/test-review-evidence.mjs`: 7 passed, 2 failed. One check expects `round-1.jpg` to remain and then fails to stat it after this task removes it as instructed. The other cannot spawn `ffmpeg` (`EPERM`) in this environment. Its bounded round 2 sheet check passed.
- No lane tier or build run, as directed. Browser scenarios were not run; Claude owns browser and art review for this card.

## Changed assertions

The generic family triangle budget is now 48,000 to cover four named vehicles. The new readback check enforces each vehicle's own 12,000-triangle cap and verifies its named body and parts, JPEG references, metallic limit and UV coordinate ranges. This reflects the card's per-truck budget; it does not loosen an individual vehicle limit.

## Race fingerprints

Not applicable. This art-only change does not touch race rules or simulation code.

## Claude review

This is a partial visual round, not a visual pass. The dozer faces the right way, but the ambulance, Vane truck and escort front/overhead projections still have broad seams or flat areas. Please review the matched side, front and overhead pairs on the sheet, especially the ambulance front and the two Vane trucks' end and roof views. The round review note records per-vehicle scores and the main remaining differences.

## Removed

- Removed `docs/board/looks/town-art-trucks-2/round-1.jpg` as requested.
- Removed the build renders, temporary Blender file and test/build logs created during this round. Kept the round 2 sheet, its review note, the model and its credited source photos.
