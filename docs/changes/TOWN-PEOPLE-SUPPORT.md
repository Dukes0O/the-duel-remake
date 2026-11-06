# TOWN-PEOPLE-SUPPORT

## Status

Follow-up pass in progress. Report history, home-ground cost and plot/build
guards are fixed; pace tuning remains for the next commit.

## Settled design

- Repeated open reports refresh when their kind and place match. Different
  places can keep separate reports open.
- Keep the latest 24 resolved routine reports and report effects. Preserve
  unanswered reports, non-routine reports and reports held by the Book.
- Old saves trim routine report history during the first daily report step.
  The Book itself is not trimmed.
- Home-ground work builds family-to-people and occupied-family maps once in
  its scheduled daily step. Family selection follows people order.
- Placement commands reject painted cells. Route completion checks route
  segments against painted 8 m cells. Clearing mixed selections removes empty
  plots and reports how many were skipped because they are occupied, burning
  or under construction.

## Evidence

- Before change, `node tools/soak-town.mjs`: seed 5101 reached 3,508,331 saved
  bytes and failed the unchanged save-size check. A diagnostic run found 1,313
  resolved sickness reports, 336 resolved trader reports, two open reports and
  1,649 report effects.
- After change, the soak's save-size checks passed for all ten seeds. Year 30
  saves ranged from 255,403 to 273,659 bytes. The run then failed the existing
  10,000-person/5,000-building timing check at 38.43 ms; step 2 addresses that.
- `node tools/test-town-reports.mjs`: 75 checks passed.
- `node tools/test-town-people-support.mjs`: 23 checks passed; the warmed
  10,000-person/5,000-plot day took 26.02 ms.
- After plot guards, `node tools/test-town-people-support.mjs`: 30 checks
  passed; the warmed daily home-ground hook took 11.32 ms for 10,000 people
  and 5,000 plots. The timer covers the daily system itself, whose registration
  is checked at 24 ticks; the full town day is covered by the separate people
  suite.
- `node tools/test-town-people.mjs`: its 10,000-person/5,000-building timing
  assertion failed at 34.84 ms. Its fixture has no home plots, so this lane's
  home-ground indexing does not affect that measurement.
- Browser check: Claude runs it. Please check the partial-clear message and
  that buildings, roads and pipes cannot cover painted plots or finished homes.
- Race fingerprints: none recorded; this slice changes town reports only.

## Assertions changed

- The report-kind count changed from 10 to 11 because the current event table
  includes `home-goods-shortage`.
- The report sentence check now verifies that choice labels and outcomes are
  each complete sentences. It no longer requires them to be identical; the
  home-goods choices use an action label and a separate outcome sentence.
- The report sorting check now checks the highest priority and kind because
  reports of the same kind may now be open at different places.
- The former no-duplicate assertion now checks that a same-kind, same-place
  report refreshes in place, and a separate-place case checks that both remain.
- Added a daily-spacing assertion and a warmed 10,000-person/5,000-plot
  performance assertion. The existing 30 ms limit is unchanged.
- Added command assertions for building, road, pipe and route placement on
  plots, plus partial clearing with the exact cleared count. No existing
  plot/build assertion was loosened.

## Removed

- Unbounded resolved routine report and report-effect history.
- No files removed.
