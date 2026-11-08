# TOWN-ART-FUN change note

## Changed

- Built the stalls with a 1.20 m front-to-back post spacing, four corner posts, depth rails and a counter box 1.04 m deep. The counter top is at 1.03 m.
- Sloped the awning from 2.92 m at the rear to 2.60 m at the road, with the existing photo-mapped canvas on top and the scalloped hem at the front.
- Matched the broad side reference's proportions at about 2.5 m wide. The weathered and painted plank materials remain on the counter faces and top.
- Round 22 sheet: 270,258 bytes. GLB: 4,608,656 bytes. Hit-the-can: 1,354 triangles; sweets: 1,786 triangles.

## Checks

- Blender family export: passed. Both stalls remain within the 1,800-triangle limit and 1x1-cell footprint.
- Imported-GLB renders: passed for matched side/elevation, profile, rear, overhead, two three-quarter views and mayor view for both stalls. The axis probe reads 2.359 x 1.04 x 0.68 m in Blender coordinates; height is on Blender Z after glTF Y-up import. The first review attempt found the old strip dimensions in the probe; the probe now checks the new box dimensions.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets remain advisory.
- `node tools/test-review-evidence.mjs`: 7 passed, 2 failed. One test still requires the round-21 JPG that this task replaces with round 22. The other failed because `ffmpeg` could not start (`spawnSync ffmpeg EPERM`). The round-22 JPG size check passed. No test-suite assertions changed; only the recipe's counter-dimension guard was updated.
- Browser and in-game checks: Claude owns these; none were run. Please inspect the side-photo/matched-camera pair, true profile, and three-quarter views for both stalls in `round-22.jpg`.
- Changed check: the imported-GLB axis probe now expects the full counter box (1.04 m deep, 0.68 m high), replacing the old thin counter strip dimensions (0.18 m deep, 0.40 m high). The probe still checks the height axis and does not loosen the model budgets.
- Race fingerprints: not applicable; no race logic changed.

## Removed

- Deleted superseded round-21 sheet and review note. Replaced the former stall meshes in the family GLB; other buildings remain.
- Removed the thin counter strip and long front-to-back frame rails from the stall model.
