# TOWN-ART-MACHINES-2 — round 23

## Changed

- Measured the new roller side photo: body x=46–588, rear tyre centre x=453. Set the carve wheel well and built rear tyres to z=1.28 m using the carve's 5.1 m length.
- Cut the photographed tyre discs from the carve masks in all four views, and mapped the built tyre faces from the new photo centre.
- Kept the round 22 body-parent and camera-up-axis fixes. The other three trucks' recipe sections were not edited.
- Exported `machines-2.glb` (5,807,220 bytes) and added `round-23.jpg` (206,334 bytes) with its review note. The roller remains a review item: the built tyre faces appear plain and brown, and lower-body projection seams remain. Claude should inspect the side and three-quarter axle placement, tyre tread, lower-body continuity, drum/yoke contact, and confirm the other trucks remain as before.

## Checks

- Blender 4.5.13 family export and six roller renders from the exported GLB completed.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed**; confirms machine roots/parts, per-machine triangle budgets and family file budget.
- No lane tier, build, browser scenario or look check was run. Claude should review the committed `round-23.jpg`.
- Changed assertions: none. Race fingerprints: not applicable to this art change.

## Removed

- Removed the photographed roller tyre discs from the four carve masks. No files or separately built parts were removed; the drum, canopy, posts, yoke and built tyres remain.
