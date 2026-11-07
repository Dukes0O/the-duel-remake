# Radar review, round 11

The front grid measures 236 px across the tower and 685 px from the tower head to the ground. At 10.36 mm per pixel this gives a 2.45 m face and a 7.1 m tower, a 2.9:1 height to width ratio. The side grid sets the 2.25 m depth and the three X brace bays.

The tower is traced from the front photograph on its road and far faces. Its colour mask treats the grey studio, including grey held inside the lattice, as background. The side photograph sets the brace heights; open steel braces join the faces. The ladder and platform railing are separate photo traces. The deck is thin and the front and rear railing faces sit around its edge.

The accepted front dish photo remains on a lathe. Its rear uses the grey plate photo. The rim mesh is removed. `radar:dish` turns around the tower centre's vertical axis above the platform.

The radar uses 1,696 triangles. The family GLB is 2,452,764 bytes, and the review sheet is 281134 bytes. The wellhead geometry and node records match the accepted family model.

## Self review

| Silhouette | Proportions | Materials | Detail | Readability | Grounding |
|---:|---:|---:|---:|---:|---:|
| 4/5 | 4/5 | 3/5 | 3/5 | 4/5 | 4/5 |

The side and front reads are now tall and slim. The dish and rear plate read as a rotating assembly. The front mask still creates a few narrow triangular tips at brace joints. Claude should judge those, the platform railing, the head connection, the dish centre and the rear three-quarter view.

## Checks

- Blender recipe, export and seven radar views: passed. Radar 1,696 triangles; family GLB 2,452,764 bytes.
- `node tools/test-blender-output.mjs`: 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed. The audio analysis subtest failed with `spawnSync ffmpeg EPERM`; its one rerun failed the same way.
- Lane tier and build: not run, as directed for this art card.
- Browser and in-game look checks: not run. Claude should inspect the side and front proportions, open lattice, platform, ladder, dish edge and turn axis.
- Changed assertion: the radar registration now requires the tower, ladder, platform and side braces, and asserts that `radar:dish-rim` is absent. This records the requested rim removal; no assertion was weakened.
- Race fingerprints: not applicable; no race code changed.

## Removed

- Removed the round-10 review sheet and note, and removed the dish rim mesh.
- Replaced the prior wide side photo slabs with open side braces positioned from the side grid.
- Kept the accepted wellhead node records unchanged. Rounds 6, 7 and 9 remain.
- Temporary grid overlays, masks, renders, comparison scripts and logs are deleted after commit preparation.
