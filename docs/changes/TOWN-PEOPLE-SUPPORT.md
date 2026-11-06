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
- Browser and look checks: Claude to inspect the plot drawing, fire and rebuilt-home states.
- Browser and look checks: Claude to inspect the plot drawing, fire and rebuilt-home states.
- Changed assertions: none yet. Race fingerprints: not applicable; town simulation only.

## Removed

- Removed the building-bed and painted-building place estimate and the old people-system home tier updater; painted plot simulation now owns those facts.
