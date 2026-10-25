# TYRE-SLIP-DRIFT-RETUNE: the Neon Drift Trial keeps the quick launch under the sliding-tyre rules (dev switch `tyre-slip`)

Raised by FIX-LAUNCH: with the gentler launch (`DRIVE.accelScale` 5.2 to 2.5) the Pro recovery fixture in `tools/test-drift-trial.mjs`
banked 142 points (was 4,828) and timed out. The switch off was never affected.

## Why

The scripted sliding-tyre drifter comes out of the first corner 10 to 15 mph slower with the gentle launch. The drift line only holds
above about 100 mph there: slower, the same drift steering turns the car tighter than the road needs, it runs wide off the narrowing road
(half-width 10.5 m to 7 m), and every chain is lost off-road before it banks. Putting `accelScale` back to 5.2 alone restores
the old score (4,828) and time (97.6 s) exactly, so the launch is the whole difference. Retuning the drift thresholds
(`driftLineSkill`, `driftMinMph`, `scrubMphPerSec`, `driftLiftSlip`) and the driver's brake law instead reached about 2,600 points at best, none held Hard's 110 s limit, and the
result was chaotic (nearby values scored 4,684 and 3,041).

## What changed

- `src/config.js`: `TYRE_SLIP.driftTrialAccelScale` (5.2) and a third argument to `launchScale(course, recovering, slipRules)`: on the `drift`
  course with the sliding-tyre rules latched, the launch is the old one, as for arenas. It lives in `TYRE_SLIP`, not `DRIVE`, so `DRIVE` stays byte for byte
  (its pin in `test-tyre-slip` holds).
- `src/sim-driving.js`: passes `s.tyreSlipRules` to `launchScale`.
- `src/app.js`: the scripted sliding-tyre driver builds its speed profile with the launch the car really has there (`accelFactor`).
- Unchanged: Pro tyre grip, scrub and drift numbers; the switch off; every other course, arenas and crash recovery. The trial's score and time targets are untouched.

## Checks (Linux cloud)

- `tools/test-drift-trial.mjs` passes **with no assertion changed**: the Pro recovery fixture's three levels bank 4,828 points
  in 97.6 s, exactly as recorded, and the released-rules replays (152 checks) are unchanged.
- `tools/test-tyre-slip.mjs`: one new test (30 of 30): `launchScale` for the trial with and without the rules, any other course, arenas and
  recovery; and the trial reaches 55 mph in first gear clearly sooner with the rules on than off. Setting the new constant back to 2.5 makes it fail.
- Lane tier and build: see the end of this note.

## Removed

Nothing.
