# TOWN-CORE

## Changed

- New building placements are `plan` records. Road cells reserve `roadId` and `roadState: 'plan'`; neither is marked finished. `TOWN_WORK_STATES` exports the shared work-state names for TOWN-WORK.
- Commands run through a lazy mutation journal. A refusal or caught exception restores fields, nested objects and array edits, without cloning the town.
- Town creation and migration initialize region chunks from `TOWN_REGIONS`; placement initializes its selected region from that same data. The test adds a second region.
- System loading uses a single town entry import and an eager Vite glob over self-registering system modules. The Node test uses the loader's calendar fallback.
- Town ticks use `BigInt`, with tagged JSON serialization, so time can advance past the safe-integer boundary. Legacy numeric ticks migrate to `BigInt`, and each next calendar is calculated before the tick changes.

## Checks

- `node tools/test-town-core.mjs`: passed, 637 checks. Covers planned building and road placement, refused-command rollback, second-region creation/migration/placement, system discovery, calendar and serialization beyond the safe-integer limit, 100,000 repeatable ticks, and a 10,000-person/5,000-building town. The 24-tick large-town step took 0.05 ms.
- `npm.cmd run build`: passed. PowerShell blocked the `npm.ps1` wrapper, so the equivalent Windows `npm.cmd` ran the package build script. Vite reported its existing dynamic-import and large-chunk warnings.
- Lane tier: Claude runs it under the card workflow. Browser and visual checks: no town view is wired in this card. Claude should inspect the state vocabulary and system discovery boundary before TOWN-WORK adds stages; the town has no visual surface to review yet.
- Existing assertions changed: the long-run tick expectation is now `100000n`, matching the arbitrary-length tick representation. New assertions cover the requested behavior; no tolerance was loosened.
- Race fingerprints and world signatures: unchanged; town core is headless and adds no race hooks.

## Removed

- Replaced the individual calendar import with the system loader. Moved the calendar system module under the loader's discovered modules directory.
- Replaced numeric town tick storage with tagged JSON `BigInt` storage; legacy numeric saves migrate during load.
