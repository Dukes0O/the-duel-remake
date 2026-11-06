# TOWN-VIEW

## Changed

- Added a Three.js town scene with Scablands terrain chunks around the camera, sparse chunk culling, and near, middle and far instance detail.
- Added instanced roads by road class, painted zone cells when present, building stand-ins by construction state, the Dome and Tin Town landmark assets, and colored underground utility markers.
- Terrain chunks now sample the editable Scablands surface and rebuild when an edit changes a chunk. The underground view draws saved pipe, sewer and wire segments from `town.utilities`, retaining the existing blue, brown and yellow colors.
- Added smooth street-to-Scablands camera zoom and movement, town ground and building picking, placement feedback, calendar season tint, and lamps at dusk and night.
- The scene only reads town data. It does not update people, buildings, the calendar or saved state.
- Added the card's non-browser test for camera, culling, instances, picking, placement feedback, underground view, calendar lighting and a 10,000-person town.
- No race fingerprints changed. No race fingerprint check was run because this view has no race hooks.

## Checks

- `node tools/test-town-view.mjs`: passed. New cases cover edited terrain rebuilding and utility routes without matching buildings.
- `node tools/test-town-pipes.mjs`: passed.
- `npm.cmd run build`: passed. Vite reported the existing mixed static and dynamic import warning for `src/game.js` and large chunk warnings.
- Lane tier was not run, as requested. Browser checks and visual look review were not run; Claude owns them.
- No test assertions changed.

## Claude should look at

- Open an empty town and a town with roads, zones, buildings and sites. Check the ground, stand-in scale, ground placement, and that the Dome and Tin Town art sit in the right places.
- Cut a trench in the Scablands and confirm the town ground chunk updates to show it.
- Lay a pipe, sewer and wire route with no matching building and confirm each appears in the underground view with its existing color.
- Check smooth zoom and turn controls, picking, valid and invalid placement colors, the underground utility colors, and day, night and seasonal lighting.
- Review how this scene API should be mounted by the town screen. This card's owned files do not include the screen or app router.
- Inspect a 10,000-person town for responsive culling and visual readability. Frame timing remains for when a large town can be reached in game.

## Removed

- The underground overlay no longer relies only on building identifiers; it now reads the saved utility route layers too.
