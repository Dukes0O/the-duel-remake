---
task: TST-03
status: merged
kind: test-debt-fix
flag: none
player_facing: no
---

## What changed

The balance report already measured ten no-weapon races per CPU difficulty,
but `--check` did not compare their win rates with the targets in `SPEC.md`
section 13. The check now uses the measured wins and races to enforce Easy
80–95%, Medium 45–65%, and Hard 20–40%. Missing or invalid samples fail.

The new focused suite checks both target boundaries, out-of-range values, and
missing samples. This changes only the acceptance gate. No race rules, save
data, or player-facing behavior changed.

## Verification

- `node tools/test-balance-targets.mjs`: passed.
- `git diff --check`: passed.
- On the unchanged integration game rules, `node tools/combat-balance.mjs
  --check` ran 21 weapon-policy and 30 baseline races in 81.71 seconds. It
  failed as expected: Easy and Medium both won 10/10, above their targets.
  Existing UFO and Medium/Hard CPU-hit failures remain visible. The check did
  not replace or weaken any of those failure conditions.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8 --json`: 161/161
  suites passed in 346.51 seconds, including 162 replay fingerprints.
- `npm run build`: passed with the existing large rendering chunk warning.
- Exact integration merge `c20e8f0`: 153/153 short suites passed in 379.97
  seconds, production build passed, and private High/Performance browser smoke
  passed on port 9381 with four screenshots and zero warnings or errors.
- Independent read-only review found no actionable issue with the inclusive
  ranges, input validation, or preservation of the other balance failures.
