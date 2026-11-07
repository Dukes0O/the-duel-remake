# TOWN-ART-FOOD greenhouse round 13

The model replaces the separate frame and pane construction with a single opaque `carve_object` shell using four photo views. The photo surfaces carry the windshields, rust, patched plastic, door and green rows.

## Claude should inspect

- Compare side, front, rear and overhead photos with the matching carved views. The front and rear silhouettes are flatter than their source gables; check if the door reads at about 2 m.
- Check the roof plan's small cutout, the photo texture's legibility at town scale, and the three-quarter and mayor views.
- The source photos differ in scale: the front door is about 305 px, the side body about 400 px, and the overhead plan's ratio differs. The model uses the door for the end views and the side span for length.

## Checks

- Blender 4.5 export: passed, `food.glb` 2,481,676 bytes.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; size targets advisory.
- `node tools/test-review-evidence.mjs`: 8/9 tests; JPG publication passed, audio-analysis failed with `spawnSync ffmpeg EPERM`.
- No lane tier, build, browser or in-game check; those are excluded or assigned to Claude for this art card. No assertions changed. No race fingerprints apply.

## Removed

- Replaced the frame, pane and separate plant geometry with the carved shell.
- Removed the superseded round-11 sheet and review note. Rounds 6, 7, 9 and 12 remain.
