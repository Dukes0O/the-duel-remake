# TOWN-REPORTS

Added condition-based town events for fires, sickness, trader deals, dust
storms, drought warnings, Road Rat raids, children's drawings, families
considering leaving, stopped building sites and Vultures' savings. Reports
show who, what and where, sort unanswered reports worst and newest first, and
offer up to three whole-sentence answers. Towns allow at most three unanswered
bad reports at once. Reports without an answer resolve to their stated `leave`
outcome after seven in-game days.

Report data uses the existing generic town serializer. Older towns start with
an empty report list. The event fact contract and seven-day expiry are written
on the card under “Codex decided (Claude to review)”.

## Checks

- `node tools/test-town-reports.mjs`: passed, 36 checks.
- `npm.cmd run build`: passed. Vite reported the existing dynamic import warning
  for `src/game.js` and warned that some built chunks exceed 500 kB.
- Lane tier: Claude runs it.
- Browser and look checks: not run here. Claude should check report order,
  who/what/where text, answer outcomes, the three-bad-report limit, and the
  seven-day ignored-report outcome in the town screen.
- Changed existing assertions: none. Race fingerprints and world signatures:
  unchanged; this card does not touch race code.

## Removed

Nothing was replaced or removed.
