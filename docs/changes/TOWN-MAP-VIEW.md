# TOWN-MAP-VIEW

## Changed

- Added `buildTownMapMarkers` to return uncapped, read-only marker records for Scablands places, outposts with saved coordinates, moving vehicles with saved positions or road paths, and unanswered reports with known locations.
- Added `focusTownMapMarker` to move the town camera to a marker while keeping its current viewing angle.
- Added a focused check for marker sources, road interpolation, report targeting, read-only town data and camera focus.
- Recorded the card's coordinate and ownership decisions under “Codex decided (Claude to review)”.

## Checks

- `node tools/test-town-map-markers.mjs`: passed.
- `npm.cmd run build`: passed. Vite reported the existing dynamic-import and large-chunk warnings.
- `npm run build`: PowerShell blocked `npm.ps1` before the build began; reran the same build through `npm.cmd` successfully.
- Lane tier and browser checks: not run; Claude owns them.
- Browser checks for Claude: decide and verify the scene/UI wiring for rendering and clicking these markers. Confirm marker visibility at Scablands zoom, label readability, camera focus on click, and behavior for reports/outposts/trucks without saved coordinates.
- Changed assertions: none.
- Race fingerprints and world signatures: not applicable; no simulation, course or world-signature files changed.

## Acceptance gap

The card names only `src/town/view/town-map-markers.js`. Current outpost and trade-truck records do not consistently store map positions or road paths, and the scene/input files do not call a marker layer. This change provides the read-only marker and focus API without changing files outside the card's named ownership. The visible labels, pins and click-to-focus behavior still need a scene/UI integration task and coordinate data for outposts and trucks. Do not treat this module alone as the finished visible map feature.

## Removed

- None.
