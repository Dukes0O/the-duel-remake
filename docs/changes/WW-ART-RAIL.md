# WW-ART-RAIL: Wednesday and the coal heap

Date: 6 November 2026

## Changed

- Added the separate `wednesday` locomotive node and the `coal-heap-full`, `coal-heap-half` and `coal-heap-low` heightfield nodes to `rail-trains.glb`. The heaps use `town_base.make_materials`; export uses `town_base.export_glb`.
- Added three generated reference photographs and one generated sand-and-coal texture under `public/assets/models/wasteland/rail/textures/`, with prompts and credits.
- Added node-presence assertions for Wednesday and the three heap states. Existing assertions were not loosened.
- Added the round 6 review sheet and note. The sheet is 172,686 bytes. The GLB reads back as 3,736,136 bytes, under the 3.8 MB target and 5 MB card budget.
- The passed 2:15 engine, track, drift, carriage and van geometry in the Blender recipe was left untouched. The resulting GLB retains their prior node triangle counts.

## Checks

- Blender 4.5.13: built and exported the GLB, imported it into an empty scene, set the view transform to Standard, and rendered the review views. Export completed without an exception. Total triangles are 38,434, including 1,680 for Wednesday and 4,480 per heap.
- `node tools/test-blender-output.mjs`: passed, 292 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; no oversized look sheets.
- No lane tier or build, as required for an art card. No browser or look check was run; Claude should review `docs/board/looks/ww-art-rail/round-6.jpg`.
- Art acceptance is not met. The side view reads as a small engine, but front and three-quarter views still show flat photo-projected surfaces and weak joins. The full heap exposes more of the upper boiler than intended. Round 6's review note records these faults; this is not approved art.

## Changed assertions

Added four assertions for the separate Wednesday and coal-heap node names. No existing assertion or tolerance changed.

## Race fingerprints

None. The model is not wired into a playable scene.

## Removed

- Removed the temporary source copies, render outputs, masks, Blender log, sheet-maker script and generated `.blend` file after creating the committed assets and review sheet.
- Kept `round-3` and `round-4` sheets and review notes unchanged, as instructed.
