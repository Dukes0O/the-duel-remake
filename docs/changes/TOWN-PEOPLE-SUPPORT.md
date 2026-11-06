# TOWN-PEOPLE-SUPPORT

## Changes

- Replaced the first-pass building-bed estimate with an open-ended saved plot list and the settled home tier data table.
- Added `paintHomeGround` and `clearHomeGround` town commands, daily construction work that takes goods from the nearest stockpile, legacy-save migration to an empty plot list, plot-based shelter measurement, and fire loss that returns residents to canvas.
- Updated the people system to use the new home tier labels and removed its old bed-count-driven plot proxy.
- Added the `home-goods-shortage` report to the existing town reports catalog; plots waiting for a specific good raise a plain-language report with the home count and missing good.
- Added the plot paint and clear controls to the Homes and Shops tab. Mouse drags map to 8 m cells and send the plot commands; visits remain look-only because the build panel is absent there.
- Added plot visuals to the existing per-chunk town building renderer: pegs and string for empty plots, the four scaffold models during construction, and tier variants cloned from `homes.glb` when complete. Render state is derived from plots and cannot write to the sim.
- Added the requested support acceptance checks for no work, plot construction, incoming residents, shortages, water, legacy saves and read-only measurement.
- Changed only the setup in `tools/test-town-people.mjs`: added a `setMeasuredHousing` fixture that paints real plot cells, marks them as existing finished homes, creates a measured well and stocks food; called it for the two long-run towns and the recovery town; and replenishes that fixture well per current population in `stepDay`. Turned off that replenishment when the test dries the well. No assertions changed.

## Checks

- `node tools/test-town-people-support.mjs`: passed, 20 checks.
- `node tools/test-town-people.mjs`: passed, 36 checks; 30-year run produced 1,574 living people and 950 Old Ground entries; 10,000-person day 25.89 ms.
- The existing people test assertions were not changed. Setup-only edits are exactly: added `dispatchTownCommand` to imports; added `setMeasuredHousing` to paint 8 m cells and fixture them as finished homes, create a measured well and stock food; called that helper for `first`, `second`, `supported` and the recovery setup for `challenged`; added one warmup day after installing support; replenished the fixture well in `stepDay` to 50 L per current person; and disabled that replenishment for the dry-well case.
- Merged `codex/town-pace`, replaced the hand-written support conditions in its 10-seed helper with NEXT tasks, pit and well commands, a supplied and completed soup kitchen, painted plots, and additional working wells. Food and home materials arrive through `deliverTownGoods`. Tuned only `src/town/content/pace.js`: first winter 29–32, Year 1 34–38, Year 2 101–130 people across ten seeds. `tools/test-town-pace.mjs` passed, 364 checks; its acceptance assertions were kept.
- Updated `tools/soak-town.mjs` to seed its long-run towns with painted finished plots and a measured well after the support migration. `node tools/soak-town.mjs` ran the default 30 years across ten seeds, then failed its existing save-density check: seed 5101 grew from 95,251 bytes in Year 1 to 3,540,938 bytes in Year 30 (102 people, 309 book entries); about 2.9 MB was accumulated reports. The test assertions and 30-year default were unchanged. This is not a timeout, so no reduced-year flag was used.
- Browser and look checks: Claude to inspect the plot drawing, fire and rebuilt-home states.
- Browser and look checks: Claude to inspect the plot drawing, fire and rebuilt-home states.
- Changed assertions: none yet. Race fingerprints: not applicable; town simulation only.

## Removed

- Removed the building-bed and painted-building place estimate and the old people-system home tier updater; painted plot simulation now owns those facts.
