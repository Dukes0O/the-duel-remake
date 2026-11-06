# TOWN-PEOPLE-SUPPORT

## Design choice

The town support system reads finished building rows with a positive `beds`
value, counts only intact finished homes, and starts with the founders' camp
at 12 places. It reads delivered network water, or water remaining in
completed wells when the network has no delivery result, and divides that
amount by the current population. It copies the seasonal water need from
weather into the people support fields.

The current integration branch has no housing rows with bed counts:
`src/town/content/homes.js` only lists home tier names. It also has no real
home painting/construction path. The separate `codex/town-pace` worktree is
active and not part of this lane. The card records this choice and gap; the
real-homes arrival scenario and the requested TOWN-PACE real-command rewrite
remain for Claude to review and finish when the housing content is available.

## Changes

- Added a registered daily people support system. Finished, intact buildings
  contribute places only when their content row declares `beds`.
- Measured shelter, painted places, delivered water per person and weather's
  water need are written together to `town.peopleConditions`.
- Added a targeted test for founders' camp capacity, no-water/no-arrival
  behavior, matched water need, legacy save loading and read-only serialization.

## Checks

- `node tools/test-town-people-support.mjs`: passed, 8 checks.
- `node tools/test-town-people.mjs`: failed at its 30-year childbearing
  assertion. That test seeds `peopleConditions` directly but has no measured
  well or completed housing, so the new system correctly replaces the test's
  hand-set support values with zero measured water and the founders' camp.
  No assertions were changed.
- `npm.cmd run build`: passed. Vite reported its existing dynamic import and
  large chunk warnings.
- Lane tier and browser checks were left to Claude as directed. No lane tier
  or browser check was run.
- Race fingerprints: not applicable; this change is limited to the town sim.
- Claude should review the support data mapping, add actual housing content
  and a real-command arrival check, then update the TOWN-PACE test on its lane.

## Removed

Nothing replaced. No old path was removed.
