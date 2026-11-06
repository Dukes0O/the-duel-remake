# TOWN-WMAP-UI

## Changed

- The town opens the Wasteland map after zooming out to the far end. Zooming in, Escape or Return to the town closes it. M opens and closes it. The town clock and race state are not changed by opening the map.
- The map uses data coordinates and region colors from `src/town/content/deeds.js`, with roads to each territory and a named Scablands town marker. Fogged territories show a cloud without their name. Deed cards open by click and include plain-language prices, owner state, bids and set bonuses. Dispatch cards name the crew, job and chance in words and numbers.
- Map deed actions run through the town command dispatcher with the player profile. Buying updates the real town, till and owner. Refusals are shown in the map status. Visiting another player's town hides purchase and bid controls, and its commands remain refused by the visit session.
- Updated the map tests with a real town deed purchase and an unclaimed-territory refusal. Added `tools/scenarios/town-wmap.mjs` for Claude's browser run.

## Checks

- `node tools/test-town-wasteland-map.mjs`: passed, 28 checks.
- `node tools/test-town-visits.mjs`: passed.
- `node tools/test-town-hooks.mjs`: passed.
- `npm.cmd run build`: passed. Vite reported its existing dynamic-import and large-chunk warnings.
- Lane tier: not run, as requested. Browser scenario: not run; Claude runs it.
- Race fingerprints: not applicable. This work does not alter race code or rules.
- Changed assertions: updated the map markup expectation to match the new whole-sentence copy; no behavior checks were weakened.

## Claude should review

- Check the far-zoom transition, return paths, M key, preservation of town pause/run state, and that no race state changes.
- Run `tools/scenarios/town-wmap.mjs`. Check the paper look, region placement, road drawing, cloud fog, deed open/purchase/refresh flow, visit-mode controls and dispatch readability.
- The pilot-map directory contains only GLB props and no paper image to reuse. The map uses a CSS grain and parchment color treatment until a reusable paper picture is available.

## Removed

- Removed the ring-based territory layout and its inline styles. The map-specific styles now live in `src/town/ui/town-screen.css`.
