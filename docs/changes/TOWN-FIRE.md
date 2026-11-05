# TOWN-FIRE

## Changed

- Added a registered, seeded hourly fire system. It uses building material data for fuel, seasonal wind strength, a daily seeded wind direction, downwind spread and `burnt-N` end states.
- Added `igniteTownFire`, pure `hoseFire` flow calculation and `applyHoseFire` for applying water. Flow is limited to the colocated hydrant's measured `flowLitresPerMinute` for one game hour.
- The 1,000 L knockdown amount uses the truck's 1,000 L/min pump rate in `docs/WASTELAND_TOWN.md` section 14 as one pump-minute. The yearly incident rate follows the town calendar's 360-day year; no real-world probability was specified.
- Kept scripted buildings protected through `fireProtectedUntilTick`, so chapter 7 can protect the soup kitchen until the player arrives.
- Added the fire tests and a written design choice to the card. The town currently has no hydrant or pipe-flow model; the test covers the named hydrant flow adapter. The truck and Fire Station can share `applyHoseFire` when their mission and building interfaces are added.

## Checks

- `node tools/test-town-fire.mjs`: passed, 15 checks.
- `npm.cmd run build`: passed. Existing chunk-size and ineffective dynamic-import warnings remain.
- Lane tier and browser checks: not run; Claude runs those under this task's instructions.
- Claude should inspect the chapter 7 release timing, that the soup kitchen cannot burn before arrival, downwind spread and seasonal wind, and water limits when the truck and Fire Station call `applyHoseFire`.
- Changed assertions: none.
- Race fingerprints and course world signatures: unchanged; this card only changes town simulation.

## Removed

- Nothing replaced.
