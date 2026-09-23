---
task: BUG-02
status: merged
kind: gameplay-fix
flag: none
player_facing: yes
---

## What changed

UFO swaps keep each driver's completed lap times and the start time of the
lap in progress. The exchanged route position, lap count and next checkpoint
still travel together. Both drivers' current laps are marked as assisted by
the swap. When an assisted lap completes, its flag is stored beside that
driver's lap times and sent with the lap-complete event. Starting the next
stage clears these flags.

## Tests and evidence

- Added a focused swap case with prior lap times of 55.2 and 53.6 seconds.
  Before the fix, the player assertion failed because `[55.2]` became `[]`.
- The cases check that checkpoint progress exchanges, both histories and
  running lap timers stay with their drivers, and the next completed lap has
  an assisted flag. Other cases check an ordinary lap and the next stage.
- `node tools/test-combat.mjs`: 49 checks passed.
- `node tools/test-race-integrity.mjs`: 601 checks passed.

- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 77 passed,
  0 failed, 0 not run in 262.56 seconds. Replay fingerprints passed 162
  checks; expansion driving completed and won all 48 races.
- `npm run build`: passed with the existing large rendering chunk warning.

## Assertions and record behavior

No existing assertions changed. The game currently tracks full-race bests,
but has no separate best-lap store. The assisted flag makes a swap lap
identifiable for any later best-lap feature; it does not change today's
full-race best or leaderboard rules. There are no sector-time records in the
current game; `nextLapGate` is the checkpoint progress field.

## Review

The lane gate passed. Independent review found that stage results needed their
own copy of the assisted-lap flags; the review fix below supplied it.

## Review fix: result snapshots

Finished, timed-out and game-over results now copy `assistedLaps` beside
`lapTimes`, so the flag remains available after racing ends. A new
finished-race assertion failed before this change because the result had no
`assistedLaps` field. It now checks the values and that the result has its
own copy. No full-race best or leaderboard rule changed.

- `node tools/test-combat.mjs`: 52 checks passed.
- `node tools/test-race-integrity.mjs`: 601 checks passed.

## Integration

The reviewed changes were cherry-picked as `7f87cae` and `1b0e1e7`.
All 145 merge-gate suites passed in 162.11 seconds. The production build and
private High/Performance browser smoke passed with four screenshots and no
browser warnings or errors.
