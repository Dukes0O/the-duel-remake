# TOWN-ART-TRUCKS-1 change note

## Changed

- Replaced the tanker, supply-truck and tow-rig box recipes and camera-projected paint with the measured multi-view `carve_hull` path. The accepted fire-truck code and pictures remain unchanged.
- Added 12 photo crops to the town texture folder, with prompts and credits. Generated photo textures for timber, tin, rusted steel and canvas now supply sharp repeating materials for non-body parts.
- Added photo-measured axle, ground, wheel and track tables. The tanker uses tandem rear axles; the tow rig uses dual rear tires. The supply cargo is separate under `supply-truck:load`, and the tow cable and hook sit under `tow-rig:hook`.
- Removed the retired camera projection materials, helper and three projection images.

## Checks

- Blender export and imported-GLB render: passed. Family file: 3,128,640 bytes. Triangle counts: fire truck 10,352; water tanker 10,092; supply truck 9,690; tow rig 9,536. Each stays below 12,000 triangles and the family stays below 8 MB.
- `node tools/test-blender-output.mjs`: passed, 284 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; no placement failures or oversized look sheets.
- Browser and independent look review: Claude should inspect `round-10.jpg` and the imported model. No browser run in this art lane.
- No race simulation, saves, rewards or physics changed; race fingerprints do not apply.
- Changed assertions: the truck Blender check now expects the retired projected-paint materials to be absent and all four measured photos per truck to be embedded. The assertion remains strict about names, UV channels, image formats, triangle budgets and metallic factors.

## Removed

Removed `build_truck`'s tanker, supply and tow branches, `project_paint_from_camera`, the three `*-projection.jpg` inputs and unused shape helpers. These paths were replaced by the measured photo hull builder and named parts.
