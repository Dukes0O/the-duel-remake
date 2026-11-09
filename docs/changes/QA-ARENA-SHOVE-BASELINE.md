# QA-ARENA-SHOVE-BASELINE

## Changed

- `tools/scenarios/arena-shove.mjs` now skips the redundant archived baseline
  and wall comparison when the candidate and its integration merge base have
  identical committed `src` trees. The browser report labels this
  `retired-identical-source`; changed source still uses the captured current
  integration baseline.
- `tools/test-arena-shove.mjs` verifies both branches of that decision. No
  existing assertion, threshold, or fingerprint changed.
- The pinned historical commit is not a valid substitute: it differs from
  current integration in 546 `src` files and 651 runtime assets, beyond the
  scenario's explicit source and asset limits.

## Checks

- `node tools/test-arena-shove.mjs` — passed, 133/133 Node tests, 16,965
  acceptance checks, zero failures, 265.26 s.
- `npm.cmd run build` — passed, Vite built 649 modules in 1.94 s. Existing
  dynamic-import and large-chunk warnings remain. PowerShell blocked the
  `npm.ps1` shim before it could start; `npm.cmd` ran the same build script.
- Lane tier — Claude runs.
- Browser scenario — Claude runs `arena-shove`; check that the identical-source
  report skips only the archived comparison and still records all eight public
  wall controls on the candidate. No browser or look check was run here.
- Changed assertions: none. Added checks cover the baseline-selection rule.
- Race fingerprints: unchanged; this task changes only QA scenario selection
  and its test.

## Removed

- Removed creation and execution of the duplicate current-source snapshot and
  wall comparison for identical committed `src` trees. Native candidate
  controls remain in the arena-shove scenario.
