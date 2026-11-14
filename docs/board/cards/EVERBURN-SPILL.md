# EVERBURN-SPILL

From the Everburn go-live review, 13 November 2026 (Claude). Job 1 (Hot Delivery, Cinder's ember
pot) and the notice board's Hot Soup both say the load is lost in a hard crash, and each has a
spoken line for it. In the real game no crash ever spills either load: the carry step reads
`state.lastCrashSize` (`src/arena/modes/world-job.js`, where the step's input is built) and
nothing in the game sets it. The rule itself works when the number is set by hand: the line is
spoken and the car goes back to the last safe point it passed, keeping its progress to there.

## What to build

Report a crash to the carry step when the player's car, in a world job, hits a solid, a barrier or
another car hard. Do it inside the world-job mode from what the game already knows after a step
(the speed lost in that step against the speed before it); do not change the car's physics or any
race outside world jobs. Replay fingerprints must not move.

## Design numbers (settled by Claude, 13 November 2026)

The existing rule in `src/world/jobs/steps/carry.js` spills on one crash whose size is above the
step's `crashLimit` (8 for the ember pot, 10 for the soup). Keep that rule.

- The size of a crash is the speed in mph the car loses in one step from a hit. Braking, sand and
  slopes never count.
- A hit above half the limit and not above it is a warning: the screen says "CAREFUL WITH THE POT"
  (or "THE SOUP") for two seconds, so a spill is never the first sign.
- A spill is not a failed job: the load's spoken line, then the car is put back at the last safe
  point it passed.
- If scripted play on Easy and Medium shows these limits spill on ordinary bumps, stop and write
  the measured sizes on this card; Claude sets new limits here before more code.

## Checks

- One suite: a driven hit on a solid at 40 mph spills; a hit that loses 6 mph warns the ember pot
  and does not spill; braking hard from 80 mph does neither; the spill puts the car at the last
  safe point; a job without a carry step is untouched.
- `tools/test-everburn-easy.mjs` still finishes every job 8 of 10 or better on Easy and Medium.
- Browser: `everburn` and `everburn-side-jobs`, one picture of the warning on screen.
- Sound cue: the spill uses the load's own spoken line; a warning uses the existing
  crash sound.
