# GEAR-FIND-ON

Switches `gear-find` on (Kyle, 5 November 2026, for Gratian): the yard's Things to try, every weapon listed in the Armory, locked modes shown with their rank. Claude looked at the yard home and the Armory in the browser.

Changed assertions, reviewed by Claude: `tools/test-feature-flags.mjs` moves `gear-find` from the dev list to the on list. `tools/scenarios/car-loadout-armory.mjs` now counts only visible weapon buttons, because the HUD holds a hidden button for a lent flamethrower; the shown slots must still equal the saved order, so nothing is loosened.

Removed: nothing. Checks: test-gear-find, feature flags, preview launcher, yard-home, car-loadout-armory, arena-pit, lane tier, build.
