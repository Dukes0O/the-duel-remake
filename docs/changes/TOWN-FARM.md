# TOWN-FARM

## Changed

- Added seeded daily Scablands weather, a spring drought forecast and droughts that begin in summer every four to seven years. Weather sets heat-driven household water need, farm irrigation demand, cold canvas shelter risk and wind for fires and turbines.
- Added data-driven hen, goat and greenhouse production; staff care, water use, seasonal yields, kitchen cooking, calorie use and perishable food tracking. Existing stock is reconciled before spoilage so added or removed stock stays in step.
- Births and new arrivals require the current weather-adjusted water need, so 15 L does not count as enough during hot weather.
- New fields are initialized when the systems first run. Old towns need no migration and unknown saved fields remain intact.
- Added the decisions and sources to the card. Farm yields and the greenhouse irrigation rate use `docs/WASTELAND_TOWN.md` section 14. The 2,100 kcal target is from sections 3 and 14. Hen and goat water use is rounded from Penn State Extension's *Agricultural Water Needs and Sources: Water Supply* table and *Livestock Water Quality* rule of thumb. Mixed-crop yields, generic food energy values, shelf-life intervals and the Scablands weather ranges are labeled as game settings on the card.

## Checks

- `node tools/test-town-farm.mjs`: passed, 27 checks, including the hot-weather water support check.
- `npm.cmd run build`: passed. Vite reported its existing dynamic-import and large-chunk warnings.
- The `npm` PowerShell shim was blocked by the machine's script policy. `npm.cmd` ran the same package build script successfully.
- Lane tier: not run, as requested. Claude runs it.
- Browser and look checks: not run. Claude should check the spring drought forecast and summer water need, drought start and end, greenhouse winter pause, cold canvas shelter, windmill output and downwind fire spread in the town UI. Food stores should be checked after a kitchen day and after the stated shelf lives.
- Changed assertions: none in existing tests. The new card test adds 27 behavior checks.
- Race fingerprints and course signatures: unchanged. This change adds no race or course input.

## Removed

- Nothing.
