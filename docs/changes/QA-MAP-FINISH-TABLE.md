# QA-MAP-FINISH-TABLE

Lane `claude/map-finish-table`, from `integration/wasteland`. Not merged.

## Cause

The check was stale, not the game. HELI-PAY-CONTINUE (28 October 2026) raised
the Table's one-time landing pay from 500 to 1,750 credits (its pay table, and
`test-map-secrets`, already say so). `tools/scenarios/map-finish.mjs` still
required exactly 500, so the real landing paid 1,750 and the check threw
"Table landing reward/logbook missing". The game paid the right amount.

## Fix

`tools/scenarios/map-finish.mjs`: the landing check now requires a pay of
exactly 1,750 (was 500). It is written as a plain number, not read from the
game's own pay constant, so a later change to the pay is noticed again.

## Changed assertions

| Check | Was | Now | Why |
| --- | --- | --- | --- |
| map-finish, credits gained on the first Table landing | exactly 500 | exactly 1,750 | HELI-PAY-CONTINUE set the Table's pay to 1,750 (Claude's pay decision, reviewed there). Still exact, so paying too little or too much fails. |

Nothing else loosened. The scenario still requires the secrets record to show
the Table found, and the logbook panel to appear after the landing. Paying only
once is held by `test-map-secrets` (second claim returns "already").

## Checks

- `node tools/run-browser-scenarios.mjs --scenarios map-finish --jobs 1`:
  PASS, 13 screenshots, 0 warnings, 0 errors (frame timing off).
- `node tools/run-tests.mjs --tier lane --changed --jobs 2`: 21 passed, 0 failed.
- Production build (`vite build`): passed, usual chunk-size warning.

## Removed

Nothing. The lane's `.qa-dist` and `.evidence` scratch output was deleted.
