# WW-EVERBURN-JOBS

## Changed

- Added six Everburn story jobs and three Tin Town side jobs as data in `src/world/jobs/everburn.js`.
- Added `tools/test-everburn-easy.mjs`, which runs each definition through the existing headless job engine for ten deterministic Easy passes and checks completion, restart count and an action limit.

## Checks

- `node tools/test-everburn-easy.mjs` — passed; each of the nine jobs won 10/10 scripted Easy runs.
- `npm run build` — passed via `npm.cmd run build` because PowerShell blocked the `npm.ps1` shim. Vite emitted the existing dynamic-import and large-chunk warnings.
- Lane tier — not run, as directed; Claude runs it.
- Browser/look checks — Claude runs. Please check that each mission's current marker and prompt match its objective, the on-foot job clearly prompts exit and return, and the Everburn finale progresses from three defence waves to three glowing furnace vents.

## Changed assertions

- None.

## Race fingerprints

- Not applicable. These job definitions do not alter race simulation or replay fixtures.

## Removed

- None.
