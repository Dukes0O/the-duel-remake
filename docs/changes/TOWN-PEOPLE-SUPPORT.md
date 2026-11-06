# TOWN-PEOPLE-SUPPORT

## Changes

- Replaced the first-pass building-bed estimate with an open-ended saved plot list and the settled home tier data table.
- Added `paintHomeGround` and `clearHomeGround` town commands, daily construction work that takes goods from the nearest stockpile, legacy-save migration to an empty plot list, plot-based shelter measurement, and fire loss that returns residents to canvas.
- Updated the people system to use the new home tier labels and removed its old bed-count-driven plot proxy.
- Added the `home-goods-shortage` report to the existing town reports catalog; plots waiting for a specific good raise a plain-language report with the home count and missing good.
- Added the plot paint and clear controls to the Homes and Shops tab. Mouse drags map to 8 m cells and send the plot commands; visits remain look-only because the build panel is absent there.
- Added plot visuals to the existing per-chunk town building renderer: pegs and string for empty plots, the four scaffold models during construction, and tier variants cloned from `homes.glb` when complete. Render state is derived from plots and cannot write to the sim.

## Checks

- Checks for this step not run yet. The requested focused suites and build will be run after the numbered implementation steps.
- Browser and look checks: Claude to inspect the plot drawing, fire and rebuilt-home states.
- Changed assertions: none yet. Race fingerprints: not applicable; town simulation only.

## Removed

- Removed the building-bed and painted-building place estimate and the old people-system home tier updater; painted plot simulation now owns those facts.
