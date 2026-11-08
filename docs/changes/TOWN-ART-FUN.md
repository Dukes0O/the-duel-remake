# TOWN-ART-FUN change note

## Design

Built the `mud-pit` attraction in the 4 by 4 cell footprint from `docs/WASTELAND_TOWN.md`. The edge is level with the ground; the bowl is excavated below it and has two opposing ramps. One small grandstand sits beside the pit and faces it.

For the remaining `scrap-coaster`, use the four measured body photos as textured side silhouettes on two open, separated scaffold faces. Add twin rails, cross ties, an entry station and one named pivot at the train's group origin. Build three linked photo-carved carts as children of that movable train. Keep the full 6 by 4 cell footprint and the 14,000-triangle coaster budget.

## Changed

- Preserved the round-23 churned-mud photo and overhead look. The generated earth surface now meets grade at Y 0 around its full perimeter and reaches Y -1.5 m at the floor. Its two opposite approach ramps descend into the pit.
- Replaced the old stand carve with one small structure: three plank rows traced from a new generated photo set, on an open pipe scaffold. The stand stands beside the north edge on the ground and faces the pit.
- Replaced the stand's four source photos with separately generated side, front, rear and overhead images. The Blender recipe records their original paths and image-generation credit.
- Added recipe read-back bounds checks for the ground-level rim, 1.5 m floor and pieces that remain above grade. The mud pit has 6,172 triangles. The family GLB is 5,346,740 bytes.
- Added a new art-line note: cutting broad seat bands from a whole scaffold mask can cut through the supports too.
- Added the round-24 comparison sheet at 275,925 bytes. It compares pit and stand photos with imported-GLB views and includes three full-scene views.

## Checks

- Blender export: passed. The read-back printed rim Y 0, floor Y -1.5, 6,172 mud-pit triangles and 5,346,740 family bytes.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; size targets remain advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed (621 checks). The audio-analysis subtest failed because the environment returned `spawnSync ffmpeg EPERM`; it failed the same way on one rerun. The review-JPG publication check passed and accepted the sheet under 500 KB.
- Lane tier and `npm run build`: not run; the art-card instructions assign those to the merge.
- Browser check: not run; Claude should check the pit's Y 0 rim, hollow depth, ramps, tyres and stand placement in the game.
- Changed assertions: none. Race fingerprints: not applicable; no race code changed.

## Removed

- Deleted `docs/board/looks/town-art-fun/round-23.jpg` and `round-23-review.md` as requested.
- Removed the previous crate-like stand carve and replaced the four earlier stand photos. No other attraction changed.
- Replaced the old procedural coaster curve and three generic carts with the photo-built attraction and photo-built cart family.
- Temporary renders, grids and test logs are removed before handoff.
- Deleted the temporary coaster renders, masks and side-photo measurement grid after the candidate sheet and verdict were recorded.

### Scrap coaster (round 25)

- Replaced the compact hand-built coaster curve with two photo-traced scaffold faces, open cuts at 17 measured background pockets, twin rails and cross ties along the measured profile, a timber station, and three separate photo-carved carts beneath the named train parent.
- Added and credited four source views of the coaster and four orthographic views of its cart under `public/assets/models/wasteland/town/textures/`.
- Set the review captures and sheet to round 25. The mayor view uses the card's 45-degree angle.
- Corrected the review camera's up vector so both three-quarter views keep the coaster upright and fully in frame; enlarged the ground plane to remove its edge from the shots.
- Added construction-stage checks in the recipe for the 6 by 4 footprint, grade contact, supported parts, 14,000 coaster triangle cap and train part.
- The GLB test checks the three cart nodes sit under the movable train, which itself remains under the coaster root.
- The coaster has 10,044 triangles. The family GLB is 5,684,840 bytes, within the existing 8 MB family limit.
- Published `docs/board/looks/town-art-fun/round-25.jpg` at 156,228 bytes after the camera correction, with its self-review beside it.

#### Checks

- Blender export/read-back: passed; 10,044 coaster triangles and 5,684,840 family bytes.
- `node tools/test-blender-output.mjs`: passed after adding GLB parent checks for the train and carts; 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed on both attempts. Audio analysis failed twice with `spawnSync ffmpeg EPERM`; review-sheet publication passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: stopped after 13 suites passed and the Eifel audio suite failed; 33 suites not run. `node tools/test-circuit-eifel.mjs` had the same FFmpeg loudness failure on its one same-commit rerun. The sandbox cannot read the installed WinGet FFmpeg folder, so the tool falls back to a blocked `ffmpeg` command. No existing assertions or tolerances were changed or loosened; four assertions were added to verify the exported train/cart hierarchy.
- Independent code review: no blocking implementation issue. The review's hierarchy-coverage and wording findings were fixed.
- `npm.cmd run build`: passed. `npm run build` alone was blocked by the PowerShell script execution policy; the Windows command wrapper completed the same build.
- Browser and in-game checks: not run; the coaster is not wired into the game on this card.
- Race fingerprints: not applicable; no race code changed.
