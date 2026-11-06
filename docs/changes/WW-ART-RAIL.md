# WW-ART-RAIL ? carriage and van, round 2

The lane remains open. The engine, track and drift were left unchanged. One passenger carriage and the guard van are in the family GLB; the scene card places `the-2-15-carriage` three times. No other carriage was modeled.

## Changed

- `tools/blender/rail-trains.py`: isolated each subject in its own render; inset wheel-face photo coordinates; moved the van to its photographed central axle pair and added traced truss rods; added the carriage centre tank and rods, torn side eave bands and three vents; trimmed the van end/lookout joins; resized carriage and van photos in the recipe to 700 px on the long edge and canvas to 512 px.
- `public/assets/models/wasteland/rail/rail-trains.glb`: rebuilt from the recipe and imported into an empty Blender scene for all sheet renders.
- Rail textures: converted `van-end.png` to credited `van-end.jpg`.
- Replaced the round 4 sheet and note with `carriages-round-2.jpg` and its review note. Round 3 is unchanged.

## Checks

- Blender 4.5.13 export and empty-scene import completed. GLB read-back: 21,776 triangles and 2,923,260 bytes.
- `node tools/test-blender-output.mjs`: passed, 275 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: failed only on the requested filename `docs/board/looks/ww-art-rail/carriages-round-2.jpg`; its allowlist accepts `round-<n>.jpg` but not the exact task-required name. No test assertion was changed.
- Browser and art look review: Claude should inspect the four photo/render pairs and four three-quarter renders in the review sheet. The builder assessment is that the three-quarter underframe and roof/end joins are not yet convincing enough to pass.

## Changed assertions

None.

## Race fingerprints

None. This asset is not wired into a playable scene.

## Removed

- Removed `van-end.png` after converting it to `van-end.jpg`.
- Replaced `round-4.jpg` and `round-4-review.md` with the requested round 2 sheet and note; `round-3.jpg` and its note remain unchanged.
- Temporary Blender renders, masks, and test logs in `.qa-dist` will be removed before handoff.
