# TOWN-WMAP-UI

## Changed

- Added `src/town/ui/town-wasteland-map.js` with a read-only map model, pale paper map, data-driven territory markers, colored regions, flags, deed cards, set bonuses, whole-scrap bids, fog and crew dispatch cards.
- Territory and deed details come from the town deed content table and saved town/profile state. The map sends deed commands through a callback and does not mutate town or profile data.
- Added `tools/test-town-wasteland-map.mjs` for model, markup, read-only behavior and command binding checks.

## Checks

- `node tools/test-town-wasteland-map.mjs`: passed, 21 checks.
- `npm.cmd run build` (the PowerShell `npm` shim is blocked by execution policy): passed. Vite emitted existing dynamic-import and large-chunk warnings.
- Lane tier: not run; Claude runs it.
- Browser and look checks: not run. Claude should inspect the paper map at the far zoom, region spacing, fog, opening deed cards, purchase and bid commands, and dispatch readability.
- Race fingerprints: not applicable. This UI module does not touch race code or simulation state.
- Changed assertions: none.

## Removed

- Nothing. No existing files or behavior were replaced.
