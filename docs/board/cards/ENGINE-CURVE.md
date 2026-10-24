# ENGINE-CURVE

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). Packet D2, sections 12.1 and
12.5. New switch `engine-curve` (dev). Needs FIX-LAUNCH (its launch numbers
are the baseline).

Today a gear only caps speed (`src/sim-driving.js`, the `accelFactor` line):
pull falls off above half revs in every gear and nothing is weak at low
revs. Behind the switch, engines pull like real ones:

- The pull at the wheels = the engine's pull at those revs x the gear's
  multiplication (proportional to the top gear's top speed over this gear's
  top speed, then scaled as below).
- The engine's pull against revs: under 55% of its best below 30% revs,
  rising to its best around 70 to 80%, about 88% of its best at 100%; the
  limiter cuts the throttle at 100% (as the ceiling does today).
- The launch stays inside FIX-LAUNCH's traction limit.
- One scale per car, fitted so the automatic box (up at 96 to 100% revs,
  down so the revs after are at most 90%) gives today's 0 to 60 mph and 0 to
  100 mph within 2%.
- Latched per race and recorded in the race setup like `tyre-slip`.
- `tools/test-engine-curve.mjs`: switch off byte-identical (replays, world
  signatures, field results); switch on with the automatic box, every car
  within 2% of today on 0 to 60, 0 to 100 and a lap of three circuits; a
  Grand Prix field's race times within 2%; a scripted manual driver
  shifting at 50% revs at least 5% slower from 0 to 100; a car held in top
  gear from 30 to 60 mph at least twice as slow as the automatic box;
  manual shifts at 96 to 100% match the automatic within 1%.

Owns: `src/engine-curve.js`, `tools/test-engine-curve.mjs`,
`docs/changes/ENGINE-CURVE.md`. Hooks: `src/sim-driving.js` (the pull and
the automatic shift points), `src/feature-flags.js` (the switch; the switch
inventory tests gain one row, with Claude's written review on this card),
the race setup latch beside `tyre-slip`'s. Locks: `busy-game-files`.

Sound: no new cue; the engine sound already follows revs.
Art: none.

Acceptance: the test, combat balance unchanged with the switch off, lane
tier, build, one review of the code and the numbers. Removed: nothing (the
old pull stays as the switch-off path until the switch is fully on; the
janitor removes it then).
