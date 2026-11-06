# TOWN-ART-TRUCKS-1, round 6

## Changed

- Replaced the four tiled paint inputs with four generated, 1024-square truck photographs. The recipe applies camera-projected UV coordinates, mirrors the far side, and renders the exported GLB reimported into an empty scene from matched and alternate cameras.
- Rebuilt the cab with square shoulders and a seated roof, and retained the 1.1 m tyres, connected bumper and working beds/equipment.
- Added the round 6 comparison sheet and review. The review records that the projection is visibly offset and that the result does not pass visual acceptance.

The Blender bake experiment smeared the camera projection across overlapping surfaces. I removed that bake stage and restored the direct photo textures, which render more clearly. The final JPEGs are the photo sources on camera-projected UVs; they are not baked into non-overlapping UV layouts. This is a known shortfall against the card's bake request.

Final rendered GLB: 2,816,116 bytes. Triangles: fire 8,021; tanker 11,173; supply 9,119; tow 8,973. The four embedded JPEGs are 1024 x 1024. No metallic value exceeds 0.3.

## Checks

- `node tools/test-blender-output.mjs` — passed, 239 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs` — passed. Repository placement passed; the tool reported existing advisory size targets only.
- `node tools/test-review-evidence.mjs` — failed 3 of 9 subtests. One uses a fixed 5 November crew evidence path while this lane uses 6 November; one expects `round-4.jpg`, which this task explicitly required deleting; one could not spawn `ffmpeg` (`EPERM`). No test assertions were changed.
- Lane tier and build — not run, per the art-card instruction.
- Browser checks: not run in this lane. Claude should judge the round 6 sheet, focusing on cab/bonnet alignment and image streaking, source-to-model frame size, far-side/rear finish, and whether the fire reel, tanker, supply load and tow boom read from the driver view.
- Changed assertions: none.
- Race fingerprints: not applicable; this art-only change does not touch race simulation.

## Removed

- Removed the old tiled paint photographs after replacing them with the camera-projection photos.
- Removed round 4 and round 5 sheets and review notes as requested.
- Removed bake code that produced stretched, smeared projections.
