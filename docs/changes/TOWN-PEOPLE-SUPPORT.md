# TOWN-PEOPLE-SUPPORT change note

## Design

Applied the town design in `docs/WASTELAND_TOWN.md` sections 5, 6 and 13. Old saved households regain finished plots on clear, reserved-free ground near town. People with no saved home remain housed by the founders' camp, whose measured capacity expands to cover them. A fire-damaged plot becomes a tier-zero ruin when its fire ends; canvas families can rebuild it, and an empty ruin can be cleared. Shortage reports are town-wide, one open report per missing good, with shortage counts collected once per daily step.

## Checks

- `node tools/test-town-people-support.mjs` — passed, 37 checks; 5,000 waiting plots took 8.51 ms and produced two open reports for two missing goods. The separate 10,000-person / 5,000-plot day took 4.77 ms.
- `node tools/test-town-people.mjs` — passed, 36 checks; 30-year run produced 3,524 living people and 5,124 Old Ground entries.
- `node tools/test-town-pace.mjs` — passed, 364 checks across 10 seeds.
- `node tools/test-town-fire.mjs` — passed, 15 checks.
- `node tools/test-town-visits.mjs` — passed.
- `node tools/test-town-view.mjs` — passed; includes charred remains visibility.
- `npm.cmd run build` — passed. Vite reported its existing dynamic-import and large-chunk warnings.
- Lane tier and browser checks were not run, as requested. Claude should check the town view after a plot fire goes out, while charred remains are visible, during rebuild, and after clearing an empty ruin.

## Assertions

- Updated the burned-plot acceptance assertion in `tools/test-town-people-support.mjs`: it now requires the extinguished plot to have `burning === false` and `burnt === true`, while retaining its tier-zero, no-capacity and family-return checks. This reflects the requested fire-out state; no assertion or tolerance was loosened.
- Added coverage for 20 saved people through three months, plot rebuilding and clearing, one report per missing good, the 30 ms limit, and charred remains in the town view.

## Race fingerprints

Not applicable. These changes affect town simulation and town rendering only.

## Removed

- Removed location-specific shortage-report creation and replaced it with daily town-wide aggregation.
- No other files or behavior were removed.
