# TOWN-PEOPLE-SUPPORT

## Changes

- Replaced the first-pass building-bed estimate with an open-ended saved plot list and the settled home tier data table.
- Added `paintHomeGround` and `clearHomeGround` town commands, daily construction work that takes goods from the nearest stockpile, legacy-save migration to an empty plot list, plot-based shelter measurement, and fire loss that returns residents to canvas.
- Updated the people system to use the new home tier labels and removed its old bed-count-driven plot proxy.

## Checks

- Checks for this step not run yet. The requested focused suites and build will be run after the numbered implementation steps.
- Browser and look checks: Claude to inspect the plot drawing, fire and rebuilt-home states.
- Changed assertions: none yet. Race fingerprints: not applicable; town simulation only.

## Removed

- Removed the building-bed and painted-building place estimate and the old people-system home tier updater; painted plot simulation now owns those facts.
