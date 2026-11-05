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

## Claude's review (28 October 2026, night)

Approved (rule 18 written review): the scenario's exact Table pay changes 500
to 1,750 to follow HELI-PAY-CONTINUE; still exact, still requires the find
record and the logbook; paying once stays covered by test-map-secrets. Nothing
loosened.

## Follow-up verification (4 November 2026)

The assigned `codex/qa-map-finish` lane already contains this fix and the
current Table reward code. No source code or assertions needed further change.
The lane tier passed 9 suites (799 checks, 0 failed, 0 not run); the replay
guard passed 297 checks with fingerprints unchanged. `npm.cmd run build --
--configLoader runner` passed. The alternate loader kept Vite's temporary
config writes out of the shared `node_modules` junction.

The `map-finish` recheck could not reach its scenario: the stock QA build hit
the shared-junction write restriction, and the lane-local bundle's preview
closed Chrome DevTools before navigation. The report contains no screenshots or
scenario assertion results. Direct `test-map-secrets.mjs` attempts were
stopped after the heavy-job count rose above the limit, so no result is claimed
for those invocations. This follow-up did not change assertions.
