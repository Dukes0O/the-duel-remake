# TOWN-ART-DOME - round 5

## Changed

- Standardized all recipe mesh UV layers to `UVMap` before joining, including meshes created by `town_base.cube`. The exported GLB now has only ranged `TEXCOORD_0` on every primitive; the card check reads the accessor values from the GLB binary.
- Corrected each gate bus to 2.5 m wide, 4.4 m high and 11 m long. Kept the separate front and two-deck side photo crops.
- Replaced unsupported upper wall wreck geometry with one grounded relief row in front of the repeating three-row crushed-car photo. Kept the Heap and dirt picture.
- Reduced the outer floodlight towers from four to three, thickened the masts and rim rails, and added braced sign scaffold, torn tarps and bunting above the buses.
- Moved the road camera back enough to keep the whole SCRAPDOME sign and Heap visible. Added a plain camera-only ground plane after importing the exported GLB so the ground reaches the camera without changing the model.
- Rebuilt `public/assets/models/wasteland/town/dome.glb` and made the four-view sheet from the exported GLB re-imported into an empty Blender scene. Existing runtime pictures and their credits remain in place; the sheet includes a crop of a new generated reference photo.

## Checks

- Blender recipe export and three re-imported views: passed; GLB is 1,550,172 bytes.
- `node tools/test-blender-output.mjs`: passed, 251 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement is clean and no look sheet exceeds its budget.
- Lane tier and build: not run, as directed for this art lane.
- Browser and in-game checks: Claude to review; no Chrome run here.
- Replay fingerprints: not applicable; no simulation files changed.
- Changed assertions: added UV-layer and UV-range checks for every TOWN-ART-DOME primitive; existing assertions unchanged.

## Removed

- Removed unsupported raised geometry rows from the outer wall; the photo supplies the upper stacks and the remaining relief sits on the ground.
- Deleted `round-3.jpg` and `round-3-review.md` as requested.
