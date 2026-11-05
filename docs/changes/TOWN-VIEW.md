# TOWN-VIEW

## Changed

- Added a Three.js town scene with Scablands terrain chunks around the camera, sparse chunk culling, and near, middle and far instance detail.
- Added instanced roads by road class, painted zone cells when present, building stand-ins by construction state, the Dome and Tin Town landmark assets, and colored underground utility markers.
- Added smooth street-to-Scablands camera zoom and movement, town ground and building picking, placement feedback, calendar season tint, and lamps at dusk and night.
- The scene only reads town data. It does not update people, buildings, the calendar or saved state.
- Added the card's non-browser test for camera, culling, instances, picking, placement feedback, underground view, calendar lighting and a 10,000-person town.
- No race fingerprints changed. No race fingerprint check was run because this view has no race hooks.

## Checks

- `node tools/test-town-view.mjs`: passed.
- `npm.cmd run build`: passed. Vite reported the existing `src/game.js` mixed static and dynamic import warning and large bundle warnings.
- Lane tier, browser checks and visual look review were not run. Claude owns those checks for this card.
- No test assertions changed.

## Claude should look at

- Open an empty town and a town with roads, zones, buildings and sites. Check the ground, stand-in scale, ground placement, and that the Dome and Tin Town art sit in the right places.
- Check smooth zoom and turn controls, picking, valid and invalid placement colors, the underground utility colors, and day, night and seasonal lighting.
- Review how this scene API should be mounted by the town screen. This card's owned files do not include the screen or app router.
- Inspect a 10,000-person town for responsive culling and visual readability. Frame timing remains for when a large town can be reached in game.

## Removed

- None.
