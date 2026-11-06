# WW-ART-RAIL: Wednesday and the coal heap

Date: 6 November 2026

## Changed

- Added the separate `wednesday` locomotive node and the `coal-heap-full`, `coal-heap-half` and `coal-heap-low` heightfield nodes to `rail-trains.glb`. The heaps use `town_base.make_materials`; export uses `town_base.export_glb`.
- Added three generated reference photographs and one generated sand-and-coal texture under `public/assets/models/wasteland/rail/textures/`, with prompts and credits.
- Added node-presence assertions for Wednesday and the three heap states. Existing assertions were not loosened.
- The round 6 sheet remains in place. It is not replaced because the new three-quarter render does not pass the card's look check.
- Rebuilt Wednesday's body with `hull_model.View`, `occupancy`, `largest_part` and `carve_hull`. Added measured side and end photo mapping, mirrored far-side projection, wheel arches, four wheels, axles and rods. Reduced the three photo textures to fit the 3.8 MB file target.
- Doubled the coal texture repeat so the lumps read smaller and moved the heap cameras back to show the full shapes.
- The passed 2:15 engine, track, drift, carriage and van geometry in the Blender recipe was left untouched. The resulting GLB retains their prior node triangle counts.

## Checks

- Blender 4.5.13: rebuilt and exported, imported the GLB into an empty scene, set Standard view transform, and rendered to `.qa-dist`. Export completed. Reading the GLB gives 46,574 triangles total: Wednesday hull 9,000, wheels 768, axles 48, rods 4, and each heap 4,480. GLB size is 3,774,044 bytes, under the 3.8 MB target.
- `node tools/test-blender-output.mjs`: passed, 292 checks, 0 failed after fixing the exported node name and axle UV range. Its first run caught both issues; no assertions changed.
- `node tools/test-repo-hygiene.mjs`: passed; no oversized look sheets.
- No lane tier or build, as required for an art card. No browser check was run. Claude should inspect the existing round 6 sheet and this best-candidate GLB; no round 7 sheet is submitted because it fails visual acceptance.
- Art acceptance is not met. The side render has the corrected small-engine proportions and four wheels, but the three-quarter render still has distorted end-photo patches and visible seams. A person would read it as a toy-like photo mock-up, not a finished real engine. Stop here rather than replace the prior sheet with a failed round.

## Changed assertions

The existing four node-name assertions are unchanged. No assertion or tolerance changed.

## Race fingerprints

None. The model is not wired into a playable scene.

## Removed

- Removed this run's temporary renders, test logs, and inspection scripts. Kept only the recipe, current GLB, source textures, change note and the card's existing review sheets.
- Kept `round-3`, `round-4`, and `round-6` sheets and review notes unchanged; round 7 is withheld.
