---
task: BUG-02
status: review
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

The lane gate passed. The branch is ready for independent review before
integration.
