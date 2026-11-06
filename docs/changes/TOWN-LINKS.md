# TOWN-LINKS

Added the read-only town progression link in `src/town/town-links.js`. It
checks each mayor's warlord defeats, Water Road limit, Everburn jobs, rank,
crew, cars and chapter progress against the town's data-driven building
requirements. A shared town uses the best qualifying mayor. It returns `true`
when a building is open and plain words when it is locked. The Water Road
limit follows the design: 10,000 litres a day, plus 12,000 for each defeated
warlord, plus 200,000 when the Baron is beaten.

The card did not define the `profiles` argument shape. The card now records the
choice: `profiles` maps player ids to profiles and `town.mayors` lists those
ids. Chapter progress can come from town data or saved town story data. No
existing save shape was changed.

## Checks

- `node tools/test-town-links.mjs`: passed, 16 checks. It covers a new player,
  a mid-ladder player, a finished player, two mayors, population requirements,
  unlock text, the litres formula and unchanged input data.
- `npm.cmd run build`: passed. Vite emitted its existing dynamic-import and
  large-chunk warnings. The `npm` PowerShell wrapper was blocked by execution
  policy before the first build started; `npm.cmd` ran the same script.
- Lane tier and browser checks: not run, as assigned to Claude.
- Race fingerprints: unchanged; this helper is not connected to race code.
- Changed existing assertions: none.

## Claude should look at

- Confirm the locked menu wording and open/locked state when town content is
  connected to the town screen.
- Review the saved chapter progress sources and the shared-town mayor map
  recorded on the card.

## Removed

- Nothing replaced or removed.
