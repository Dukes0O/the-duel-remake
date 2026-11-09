# TOWN-ART-MACHINES-2 — round 26: loader

## Changed

- Replaced the old block-built loader body with front and rear photo-carved sections from a new same-machine four-view reference set. The front and rear sections sit under the articulated frame nodes.
- Added four `tyre` meshes positioned from the side-photo wheel centres, with the tyre areas cut only from the front, rear and top carve masks.
- Replaced the old block arms and bucket with side-photo traced `slab` geometry under `loader:arms` and `loader:bucket`.
- Added the round 26 reference images and credits, removed the old `machines2-loader-views.jpg` loader picture and its credit, and exported the family model at 5,575,308 bytes.
- Added the loader comparison sheet and review. The look does not pass yet: body length, tyre faces and attachment placement need more work. Claude should inspect all four matched views, the tyre faces, the pivot origins, and the rest and work poses.

## Checks

- Blender 4.5.13 exported the family GLB and rendered loader side, front, rear, overhead and work views.
- `node tools/test-blender-output.mjs`: pending final run.
- No lane tier, build, browser scenario or look check was run. Claude should review `docs/board/looks/town-art-machines-2/round-26.jpg`.
- Changed assertions: none. Race fingerprints: not applicable to this art change.

## Removed

- Removed the unused old loader reference picture `machines2-loader-views.jpg` and its CREDITS entry. Removed the old loader-only block geometry from the recipe. The paver, drill rig, mixer truck, crane truck, pipe truck and roller recipes were not changed.
