# TOWN-HOOKS, second pass

## Changed

- Kept one full-screen renderer canvas behind the interface. The map panel is transparent and lets pointer input pass through. The build and report panels float at 190 px and 170 px with semi-transparent backgrounds. `paint` only refreshes the interface.
- Set the opening camera to 90 m from the ground at 45 degrees down. `townView.zoom` uses the existing 28 m to 1,450 m range; the opening value is 62/1,422 (about 0.044). The yard model's local z bounds are 44 to 197 m. It now sits at z=-289 m, with its z=197 edge at the gate's z=-92 m. The reserved Dome oval follows the model to z=-168.5 m, leaving cell (0, 0) open in front. These values come from `town-camera.js`, `town-world-data.js`, and the supplied yard model bounds.
- Matched The Dig's ground treatment: `groundColour`, `GROUND_UV`, `/assets/textures/ground-color.jpg`, ACES tone mapping at exposure 1, a shadowed directional sun and hemisphere light. The ground ray picker returns the real hit cell. Hover shows a green or red placement box. Dragging a road sends one command per cell, and new building chunks are rebuilt as plans arrive. Road markings now sit just above the ground. A refused command keeps its plain sentence; a successful road says “Road laid.”
- Kept QA town and copy maps at module scope, so separate visits in one page use the same memory. A new town shows 0 people and 0 scrap. Road entries say “Cars drive faster on it.”
- Updated `town-opens` to drag between two map points through `Input.dispatchMouseEvent`, compute the expected cells from the scene's ground picker, and check the road state both before and after leaving and returning. Every screenshot waits two animation frames.

## Checks

- `node tools/test-town-hooks.mjs` passed.
- `node tools/test-town-view.mjs` passed.
- `node --check tools/scenarios/town-opens.mjs` passed.
- `npm.cmd run build` passed. The direct `npm` command was blocked by the machine's PowerShell script policy, so the installed command shim ran the same npm build. Vite reported its existing `src/game.js` dynamic-import warning and bundle-size advisories.
- No lane tier or browser scenario was run, as directed. Claude should run `town-opens` and inspect the town view, ground texture and Dome position; confirm the panels let map input through; drag a road and check its markings and “Road laid.” message; and verify the expected cells remain after returning. Review the six scenario pictures: `town-yard`, `town-note`, `town-first-visit`, `town-road`, `town-left` and `town-return`.
- Assertions were added for the 90 m / 45 degree camera, ray-to-cell picking, visible new plans, above-ground road markings, QA memory, zero values, and the browser scenario's pointer and state checks. No existing assertions were changed or weakened. Race fingerprints and world signatures are unchanged; no race files changed.

## Removed

Removed the screen-percentage placement formula, the automatic camera zoom rise, and the attempt to move the renderer canvas into the map panel. No lane files or runtime assets were removed.

## Claude's review notes (5 November 2026)

Independent review, three findings. (1) The change to the base colour in `groundColour` applies only to edited ground, and released Scablands jobs have none, so nothing changes for a player; left as is. (2) One town pointer on the laptop means one town: `docs/WASTELAND_TOWN.md` section 13 allows it to belong to one player or be shared, so whoever opens it becomes a mayor. Kyle was asked whether he wants a shared town or one each; this is the shared answer, and it changes easily. (3) The Book kept at most eight notes a year and lost the rest; it now keeps every note, and the page's sentence stays short. A test covers it.
