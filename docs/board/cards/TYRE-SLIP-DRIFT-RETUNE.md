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
