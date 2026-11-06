# TOWN-ART-TRUCKS-1

## Design

Continue the fire truck from the measured-photo method in `tools/blender/photo_model.py`. The side shell is one full-width traced extrusion. Wheel centers use the width measured from the front photo; wheel-face picture rectangles stay inside the tyre image. The four committed source photos now live beside the other town textures. Round 8 is a review attempt and does not pass visual acceptance.

## Checks

- Blender recipe and imported GLB render: passed; 3,878,000-byte family file. Per-truck triangle counts: fire truck 6,683, tanker 11,173, supply 9,119, tow rig 8,973.
- `node tools/test-blender-output.mjs`: passed, 280 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets remain advisory; the report lists existing oversized files outside this card.
- Browser checks: not run here; Claude should review the sheet and model at merge.
- Lane tier and build: not run, as directed for this art card.
- Changed assertions: none.
- Race fingerprints: not applicable to this art-only change.

## Removed

- Removed the round 7 review sheet and note.
- Moved the four fire-engine source photos from `.evidence/town-art-trucks-1/` to `public/assets/models/wasteland/town/textures/`; the recipe now reads those committed source files.
- Removed temporary renders and masks after assembling the review sheet.

## Round 9: the fire engine, carved from its photos (Claude)

Rounds 7 and 8 left the wheels at twice their true distance, because a parent's position was subtracted before that parent had moved, and built the body from flat parts. Round 9 adds `tools/blender/hull_model.py`: a voxel stays only if the side, overhead and end photos all show something there, the result is smoothed and reduced to budget, and each face wears the photo it faces most. Wheels, axles, cannon and headlamps are round parts placed at their true world positions.

Checks: `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs` and `npm run build`. No assertion changed. Not wired into the game, so no frame check.

Removed: `fire-engine-projection.jpg`, the fire truck's old flat-part recipe, and rounds 7 and 8's sheets.

Changed test (Claude's review): `tools/test-blender-output.mjs` lists `hull_model.py` beside `photo_model.py` among shared kits that are not asset generators, since it builds nothing alone. The fire truck is still fully checked through its recipe. Nothing is loosened.
