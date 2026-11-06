# TOWN-ART-HOMES ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â round 4

## Changed

- Updated `tools/blender/town-homes.py` to use the four JPG material sources credited in `public/assets/models/wasteland/town/textures/CREDITS.md`, sag canvas roof meshes between their poles, add guy lines and larger salvage panels, and render street views of all ten homes from above and from the road.
- Rebuilt `public/assets/models/wasteland/town/homes.glb`: 17,384 triangles and 1,534,960 bytes. The ten home ids, lamp ids and plot checks remain in place.
- Added `docs/board/looks/town-art-homes/round-4.jpg` (163,411 bytes) and its review note. The sheet includes the photo reference, individual overhead views, and both street views.
- Claude should review the still-dark and uniform wall surfaces, canvas color, and street readability against the reference.

## Checks

- Blender 4.5 recipe render and GLB export: passed; all plot clearance assertions and exported ids passed.
- `node tools/test-blender-output.mjs`: passed, 238 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; placement was clean, with reported sizes advisory.
- `node tools/test-review-evidence.mjs`: 7 passed, 2 failed. One failure is the known `ffmpeg EPERM`; the other expects `round-1.jpg`, which this task explicitly removes. The JPG publication check passed. No test assertions were changed.
- No lane tier, build, browser check, look verdict or frame check was run for this art card.
- No assertions were changed. No race fingerprints apply.

## Removed

- Deleted rounds 1 and 2 and their review notes as requested. Round 3 remains as the prior review record.
- Removed the encoded tin image source, replaced by four credited JPG textures.
- No runtime model family, test or other feature was removed.
