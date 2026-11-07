# TOWN-ART-FUN follow-up: big wheel

## Changed

- Added four generated orthographic wheel photos and four orthographic seat photos in the town textures folder, with credits.
- Added `tools/blender/town-fun.py` to import the existing family GLB, retain the earlier buildings, trace two wheel faces, carve and place eight seats, add a hub axle, and trace the A-frame.
- Rebuilt `public/assets/models/wasteland/town/fun.glb`. The big-wheel geometry is about 7,900 triangles, within the 3x3 building budget. The exported family is 3,219,328 bytes.

## Checks

- Blender 4.5 export and readback completed. It printed bounds for each big-wheel mesh. The attached wheel and seat bounds stay within the 3x3 footprint; the wheel reaches the ground through its traced A-frame.
- `node tools/test-blender-output.mjs`: 361 checks; 359 passed, 2 failed. The existing family test reports 44,437 total triangles against 42,000, and 3,219,328 bytes against 3,000,000. No assertions were changed. The task brief allows a family file up to 8 MB; the test's older 3 MB cap remains unchanged for Claude to reconcile.
- Browser/look checks: not run. Claude should inspect the wheel from the four orthographic cameras, both three-quarter views and the mayor view, confirm the seat hang and rotation pivot, and decide whether the traced support matches the source.
- Race fingerprints: not applicable; no race code changed.

## Changed assertions

None.

## Removed

None.

## Review status

The source photos and candidate model are committed for review. This lane did not produce the requested `round-7.jpg` comparison sheet, so the visual acceptance remains open.
