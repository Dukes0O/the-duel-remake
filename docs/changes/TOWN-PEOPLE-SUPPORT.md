# TOWN-PEOPLE-SUPPORT

## Status

Follow-up pass in progress. This commit fixes report history only; population
timing, home-ground cost and plot/build conflicts remain for the next commits.

## Settled design

- Repeated open reports refresh when their kind and place match. Different
  places can keep separate reports open.
- Keep the latest 24 resolved routine reports and report effects. Preserve
  unanswered reports, non-routine reports and reports held by the Book.
- Old saves trim routine report history during the first daily report step.
  The Book itself is not trimmed.

## Evidence

- Before change, `node tools/soak-town.mjs`: seed 5101 reached 3,508,331 saved
  bytes and failed the unchanged save-size check. A diagnostic run found 1,313
  resolved sickness reports, 336 resolved trader reports, two open reports and
  1,649 report effects.
- After change, the soak's save-size checks passed for all ten seeds. Year 30
  saves ranged from 255,403 to 273,659 bytes. The run then failed the existing
  10,000-person/5,000-building timing check at 38.43 ms; step 2 addresses that.
- `node tools/test-town-reports.mjs`: 75 checks passed.
- Browser check: Claude runs it. Please check that report updates keep the
  current place and detail, and that resolved report history stays readable.
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

## Removed

- Unbounded resolved routine report and report-effect history.
- No files removed.
