# TOWN-MAP-VIEW

## Changed

- Added one 128 by 128 Scablands ground mesh at scene creation. It samples the world surface and ground colours, sits below detailed town chunks, and stays hidden at street zoom. The mesh carries the Scablands road and one dark mark for each named place.
- Scaled fog from the camera's actual distance to its target. Street zoom keeps the original 90 m to 260 m fog; the far view clears the terrain with haze at the edges.
- Extended the camera's far distance so the Scablands and all named place pins fit in the map area. Chunk visibility follows the camera target, keeping the player's town buildings together in the far view.
- Added a read-only pin for the player's town at the town origin. All named place pins remain visible at the far end. The plan hint hides from zoom 0.52.
- Changed the visit button to `VISIT`.
- The town opening scenario now captures `town-map-far` for Claude's review.

## Checks

- All 28 `tools/test-town-*.mjs` scripts passed. `test-town-view` first exposed its stale 1,450 m camera setup; the setup now uses `TOWN_ZOOM.scablands` and keeps the original 90 m expectation. That test passed on rerun.
- After the far-pin layout change, `node tools/test-town-map-markers.mjs`, `node tools/test-town-view.mjs`, `node tools/test-town-ui.mjs`, `node tools/test-town-hooks.mjs` and `node --check tools/scenarios/town-opens.mjs` passed.
- `npm.cmd run build` passed. Vite reported its existing dynamic-import and large-chunk warnings.
- Lane tier not run, as requested. Browser and picture checks are for Claude.
- Race fingerprints not run; this view-only work does not change race rules or replay data.
- Changed assertions: none were weakened. The view test's setup was updated for the farther camera range while retaining its 90 m assertion. New checks cover the far mesh, visibility, terrain features, town cluster, and all place pins.

## Claude should review

Open the `town-map-far` picture. Check that the Scablands terrain and road read clearly, all pins fit inside the map without touching the build or Reports panels, the town buildings form a visible cluster under the town pin, edge haze stays light, and the plan hint is hidden. Also check the `VISIT` label and confirm marker clicks still fly to their targets.

## Removed

- Removed the fixed 90 m to 260 m fog range at every zoom; those distances remain the street-zoom range.
- Removed the `THE BOOK: VISIT` button label from the town screen and onboarding prompt.
