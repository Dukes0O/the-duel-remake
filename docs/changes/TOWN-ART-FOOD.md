# TOWN-ART-FOOD round 4

## Changed

- Rebuilt `soup-kitchen` as a photo-carved hull using `Photo`, `View`, `occupancy`, `largest_part` and `carve_hull` from the shared Blender kits. The measured reference is 4.1 m wide, 3.2 m deep and 2.7 m high.
- Added four 712 × 532 JPEG reference crops and their prompt and credit in the town texture credits. The GLB embeds 256 × 192 copies. Added a named `soup-kitchen:lamp` emissive node.
- Left the other eleven food buildings unchanged. The family GLB is 1,831,388 bytes; the review sheet is 177,087 bytes.

## Checks

- `tools/test-blender-output.mjs`: passed, 305 checks, 0 failures. Read-back covers the family triangle and file budgets, material metallic values, and UV coordinate layers and ranges.
- `tools/test-repo-hygiene.mjs`: passed. Its report lists pre-existing oversized files and advisory size totals; no placement failure.
- `tools/test-review-evidence.mjs`: the first run passed 8 of 9 subtests; audio analysis failed because `ffmpeg` could not start (`spawnSync ffmpeg EPERM`). The required removal of round-3 evidence makes the suite's rerun fail one more subtest because it still hard-codes `round-3.jpg`; the audio failure repeats. Its bounded review-sheet subtest passed. This test is outside this card's owned files.
- Blender build and exported-GLB read-back completed. No lane tier, build, browser check or gameplay run was performed, as directed for this art card.

## Claude look check

Inspect `docs/board/looks/town-art-food/round-4.jpg`, then view the soup kitchen at both game camera heights. Check oblique side and rear shape, visible openings, and the separate glow node. The new kitchen is the only revised building; the remaining eleven still need their photo-based turns.

## Changed assertions

None.

## Race fingerprints

None. This art-only change does not touch simulation code.

## Removed

- Removed the previous soup-kitchen geometry-by-eye recipe from `tools/blender/town-food.py`.
- Removed `docs/board/looks/town-art-food/round-3.jpg` and `round-3-review.md` after replacing them with the round-4 sheet and review.
