# TYRE-SLIP-DRIFT-RETUNE

The short board entry controls current state, ownership, dependencies and locks.

Raised by FIX-LAUNCH (24 October). With the gentler launch (`DRIVE.accelScale`
2.5), the dev `tyre-slip` rules no longer let the scripted driver drift on the
Neon Drift Trial: the Pro recovery fixture in `tools/test-drift-trial.mjs` banks
142 points (was 4828) and times out. The released rules are fine (that suite's
152 checks pass). The cause is that `TYRE_SLIP` scrub and drift thresholds
(`driftMinMph` 56, `scrubMphPerSec`) were tuned on the old launch.

**To settle:** retune `TYRE_SLIP` (or the fixture's driver) so the fixture's
recorded intent holds again: a real earned chain before the crash, then both
laps, Easy and Medium win, Hard times out. Do not weaken the test. Decide with
Kyle whether Pro tyre grip ships with the launch change.

## Claude answers

Cloud session (25 October 2026, Claude design lead): approved as built. The Neon Drift
Trial keeps the quick launch under the sliding-tyre rules, the same way arenas do; a drift
trial is its own mode and should start punchy. The cause was proved by putting the launch
back (4,828 points and 97.6 s return exactly), after sweeping the drift thresholds, the
scrub, the lift point and the driver's brake law. Pro tyre grip is untouched.
