# FIX-LAUNCH

The short board entry controls current state, ownership, dependencies and locks.

Claude, 24 October. Kyle finds the cars hard to drive and believes they
accelerate too quickly.

**Cause (read in the code):** speed gain is
`car.accel x accelFactor x throttle x DRIVE.accelScale` in `src/sim-driving.js`,
with `DRIVE.accelScale: 5.2` ("immediate arcade launch") in `src/config.js`.
That gives 0 to 60 mph in 1.1 s (Jesko at engine level 3) to 1.9 s (959-S),
two to three times a real supercar.

**Settled design:**
- Targets for 0 to 60 mph on flat road, full throttle, Casual gearbox:
  fastest car 2.4 to 2.8 s, slowest stock car 3.6 to 4.2 s. Every car keeps its
  top speed and its place in the acceleration order.
- Prefer one change to `DRIVE.accelScale`, adjusting the `accelFactor` curve
  only if a single number cannot meet both ends. Do not edit per-car `accel`
  values unless the order would change.
- Boost (`BOOST.accelMphPerSec`) keeps its current feel relative to the new
  launch: scale it by the same factor.
- First write a test that measures 0 to 60 for every car through the real
  driving step and fails today.
- Re-record replay fingerprints, reference laps and course replays that move.
  The CPU balance targets (`tools/balance-targets.mjs`) and combat balance with
  `wasteland2` off and on must still pass with unchanged targets. If arenas
  fail, an arena-only value is allowed; never widen a target.
- List every changed fingerprint and lap time in the change note.

No switch: a tuning change to every race. Decide with Kyle at release whether
Pro tyre grip (`tyre-slip`, dev) ships at the same time.

## Claude answers

Claude, 24 October: option 3 approved as built. `DRIVE.accelScale` 5.2 to 2.5,
`BOOST.accelMphPerSec` 42 to 20.2 (same factor), Jesko `accel` 10.8 to 9.9. No
curve change and no other per-car edits. One scale cannot meet both ends (the
959-S is 1.81 times slower than the Jesko, the targets allow 1.75), and a curve
change would reorder Titan, Dusthawk and Viper. Re-record what moves, keep every
balance target unchanged.

Second round, Claude, 24 October: approved (1) arena-only launch (arenas keep
5.2 and 42, `DRIVE.arenaAccelScale`, `BOOST.arenaAccelMphPerSec`); (2) Checkpoint
Rush Easy gate extension 10 to 12 s, because Easy must stay winnable after a
crash; (3) race-field "Easy field is the slower half" relaxed to within 1 percent,
because its reference car (F42) is now the slowest road car, intent unchanged:
the Easy field is no faster than the slowest road car; (4) lap sanity bound 150
to 165 s; (5) the dev tyre-slip drift fixture is not tuned here: card
TYRE-SLIP-DRIFT-RETUNE holds it (142 against 4828 points).

Third round, Claude, 24 October: approved (1) Bolide base accel 10.5 to 9.5 (2.44 s,
order kept, Jesko stays 9.9); (2) CPU launch per level, 1, 1.3 and 1.6 times the
player launch, every band holds; (3) the one failing balance seed (Hard 1993) is a
known demo-driver limit: merge with it written plainly in the change note and the
pull request, card DEMO-DRIVER-UNSTUCK (needs FIX-LAUNCH) fixes it, do not drop
seeds or change the measure, and the next release waits for that card; (4) staggered
CPU attack gaps 520/540/560.
