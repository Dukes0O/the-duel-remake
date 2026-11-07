# TOWN-ART-PLANTS follow-up: radar

## Changed

Rebuilt the radar tower in `tools/blender/town-plants.py`. The front photo grid measures 236 px across the tower and 685 px from the head to the ground. At 10.36 mm per pixel, that is 2.45 m wide and 7.1 m tall, about 2.9 times as tall as it is wide. The side grid sets 2.25 m of depth and the brace bay heights.

Two colour masked faces trace the front photo. Neutral grey, including grey inside the open lattice, stays background. Open X braces from the side measurements join the faces. A separate traced ladder and railing sit beside a thin deck. The accepted dish face stays unchanged on a photo lathe; the rear uses the grey plates photo. The dish rim is removed, and `radar:dish` turns around the tower centre's vertical axis.

The radar uses 1,696 triangles. The family GLB is 2,452,764 bytes. Rebuilding the family export shifted five valve node transforms on the accepted wellhead. I restored those five records from the committed GLB; the full named wellhead node data now matches the accepted model.

## Checks

- Blender recipe, export and review renders: passed. The radar is 1,696 triangles and the family file is 2,452,764 bytes.
- `node tools/test-blender-output.mjs`: 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed; audio analysis hit `spawnSync ffmpeg EPERM`. The one rerun failed the same way.
- Lane tier and build: not run, as directed for art cards.
- Browser and in-game look checks: not run. Claude should inspect the side and front proportions, open lattice, the remaining narrow triangular tips at brace joints, the platform railing, dish edge and vertical turn axis.
- Changed assertion: the radar check now requires the new tower, ladder, deck, railing and side braces, and rejects the removed `radar:dish-rim`. This records the requested change; no assertion was weakened.
- Race fingerprints: not applicable; no race code changed.

## Removed

- Removed `round-10.jpg` and its review note. Kept rounds 6, 7 and 9.
- Removed the red rim mesh and replaced the broad side photo slabs with side braces positioned from the photo grid.
- Preserved all accepted wellhead node data.
- Temporary renders, mask overlays, test logs, comparison scripts and the generated Blender file are removed after the final checks.
