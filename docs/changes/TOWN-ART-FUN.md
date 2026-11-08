# TOWN-ART-FUN change note

## Design

Built the `mud-pit` attraction in the 4 by 4 cell footprint from `docs/WASTELAND_TOWN.md`. The edge is level with the ground; the bowl is excavated below it and has two opposing ramps. One small grandstand sits beside the pit and faces it.

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
- Temporary renders, grids and test logs are removed before handoff.
