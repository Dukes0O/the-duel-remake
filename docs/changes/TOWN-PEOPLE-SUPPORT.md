# TOWN-PEOPLE-SUPPORT

## Status

Pace tuning and the named local checks are complete. Claude should run the lane
tier and browser check.

## Changed

- Tuned `arrivalMoodBase` to 3 and `arrivalYearScale` to 5. This keeps the
  Year 2 milestone near 100, leaves Year 1 below 100, and supports long-term
  growth without breaking the 30-year lineage check.
- The 30-year soak player delivers food, paints home plots, digs test pits and
  builds wells through town commands. It does not set support conditions by
  hand. The soak checks completed homes, working wells and measured water.
- Added `--seeds N` to `tools/soak-town.mjs` for shorter tuning runs. Defaults
  remain 10 seeds and 30 years.

## Checks

- `node tools/test-town-people-support.mjs`: 30 checks passed. The
  10,000-person/5,000-plot home-ground day took 8.57 ms.
- `node tools/test-town-people.mjs`: 36 checks passed. The 30-year run ended
  with 3,524 living people and 5,124 Old Ground entries; a 10,000-person day
  took 20.34 ms.
- `node tools/test-town-pace.mjs`: 364 checks passed across 10 seeds. First
  winter: 36 to 40; Year 1: 42 to 48; Year 2: 98 to 135.
- `node tools/soak-town.mjs --seeds 2`: 16 checks passed across two seeds and
  30 years. Year 30 populations were 6,012 and 5,402. Both towns finished
  1,500 home plots and had over 31 L/person/day. The 10,000-person day took
  25.92 ms. The default 10-seed soak exceeded 20 minutes during tuning and was
  stopped; the reduced run used the new flag.
- `node tools/test-town-visits.mjs`: passed. The visit lifecycle and guarded
  return save checks passed.
- `npm.cmd run build`: passed. Vite reported its existing static/dynamic
  import warning for `src/game.js` and large-chunk warnings.
- Browser and look checks: Claude to run. Please check the first-winter and
  Year 2 pace in play, and confirm the real home, well and goods route supports
  newcomers.
- Lane tier: Claude to run as requested.

## Changed assertions

No existing assertions changed. Three trial pace settings were discarded
after they failed a 30-year lineage or measured-needs assertion. The soak
population assertions remain unchanged; observed Year 30 results are recorded
above rather than adding a new population floor.

## Race fingerprints

Not applicable. This changes town simulation values only.

## Removed

- Removed the soak's direct fixture well and hand-tiered plots. The player now
  builds support through town commands.
- No assertions or other files were removed.
