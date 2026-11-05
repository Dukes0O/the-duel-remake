# TOWN-WORK

## Changed

- Added pure work-order helpers for building sites and agreed routes. Stages carry a kind, real work amount, worker-hour estimate, ingredient amounts and worker access.
- Added one advancement path. It checks ingredients before consuming them, pauses cleanly when a good is missing, and records a report with a `get-ingredient` job. Completed stages update the site's `scaffold-N` level.
- Added stable priority ordering and a minutes estimate that keeps small work near a minute and large work below half an hour.
- Exported the helpers from the town entry point. No town save fields were added.

## Checks

- `node tools/test-town-work.mjs` — passed, 25 checks.
- `npm.cmd run build` — passed. Vite reported its existing dynamic-import and large-chunk warnings.
- Lane tier — Claude runs this.
- Browser and look checks — Claude runs these. Try placing a small building, advancing its preparation stage, then attempt construction with no required goods and confirm the site pauses with a missing-good report and job. Supply the goods and confirm progress consumes the matching amount, stages must finish in order, and the site advances through `scaffold-N`. Also check a route work order with survey and trench stages, plus a tent or barrow stage available to anyone.
- Race fingerprints — not applicable; no race code or fixtures changed.
- Changed assertions — none.

## Removed

- None.
