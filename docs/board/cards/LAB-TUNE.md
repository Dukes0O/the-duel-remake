# LAB-TUNE

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). LAB section 5. Switch
`lab-tuning` (dev). Needs LAB-RULES.

- `src/lab/lab-tune.js`: `tunedCar(car, tune)` applies section 5.1 to the
  car's numbers after upgrades (pressure, springs and fuel as plain number
  changes; 0 returns the same object values exactly).
- Two hooks in the driving code: a downforce grip term,
  `grip x (1 + wing x 0.03 x (speed / 44.7 m/s) squared)` with top speed
  -1% per step, and the brake-balance change to braking strength and to the
  cornering grip left while braking (80% today).
- Fuel: in a Grand Prix on a course with a pit lane, a half tank lasts 55%
  of the race distance; empty means 40% power until a pit stop, which adds
  fuel and 5 s. Computer cars unchanged.
- Race setup carries the tuning like upgrades, so replays repeat. Lesson
  runs always use 0.
- Stock laps and the bonus (5.3): record stock Time Trial laps (seeded once
  from existing records), pay 400 once per course for a tuned lap at least
  1% faster than the stock lap of that car and course.
- `tools/test-lab-tune.mjs`: all-zero tuning gives byte-identical race
  results and replays on every circuit guard; each step moves its numbers by
  the table's amount; **no free lunch** (5.2) with the test driver in Node:
  for each wind-tunnel course some setting beats 0 by at least 0.5%, and
  every non-zero setting is slower than 0 on at least one other course (if a
  step fails this, change its number, never the shape, and record it); fuel
  runs dry at 55% and the pit adds fuel; the bonus pays once.

Owns: `src/lab/lab-tune.js`, `tools/test-lab-tune.mjs`,
`docs/changes/LAB-TUNE.md`. Hooks: `src/game.js` (tuned car in the race
setup), the driving code's grip and braking lines, `src/pit-lane.js` (fuel
service). Locks: `busy-game-files`.
Sound: the fuel stop uses the existing pit service sound; running dry plays
the existing engine stutter if there is one, else `car.sputter` (a short
cough and dip, added to the sound bank in LAB-RADIO). Art: none.

Acceptance: the test, replay and world-signature guards unchanged with all
settings at 0 and with the switch off, combat balance unchanged, lane tier,
build, one review of the code and the numbers. Removed: nothing.

## Claude answers

Settled 25 October 2026 (answers to `questions/LAB-TUNE.md`, now deleted).

1. **Fuel steps:** confirmed. Steps -2 to 0 are the full tank, +1 a three-quarter tank, +2 a half tank; +1.5% acceleration
   and braking per step above 0; the tank is a distance; empty means 40% acceleration until the stop.
2. **Pit stop:** +5 s only for a fuel setting above 0, refilled to the starting load. Confirmed.
3. **Brake-balance cornering cost** in the tuning's own hook whatever the tyre-slip switch says: confirmed, on the condition
   that step 0 leaves the grip value bit-for-bit untouched (no multiply by 1.0 that changes rounding), so a race with a
   stock tune replays identically.
4. **Two marked blocks in `src/app.js`** (pass the tune into `startCampaign` only with `lab-tuning` on and never on a lesson
   run; `settleTunedLap` where a Time Trial settles): confirmed.
5. **Seeding stock laps** from existing Time Trial records: confirmed, with a condition: a stock lap and a tuned lap are
   compared only under the same rules, so stock laps are keyed the way `bestKey` separates rule sets (tyre-slip,
   engine-curve). A record from a different rule set never seeds or judges a tuned lap.
6. **This card now holds `save-shape`:** the tune and `stockLaps` join the save. Add save fixtures for an old save without
   them (loads untouched) and a forged or out-of-range tune (clamped or refused); never wipe or reset existing records.
7. **Independent review before the PR** (the 400-credit bonus is pay, the change is saves): a separate reviewer probing paying
   twice, the 1% rule edges, NaN or forged values, the switch off, an old save; list what it probed and fixed in the PR.

## Claude's review at merge (25 October 2026)

- Changed assertion in `tools/test-save-fixtures.mjs`, approved: the
  historical roster goes from 20 to 21 for the new honest fixture
  `21-lab-tune.json`; forged saves move to `tools/fixtures/saves-forged/`,
  and only that folder may name `labExpected`. Every honest fixture still
  round-trips byte for byte. Nothing loosened.
- Tuned Time Trial laps are not written to the leaderboard: agreed (records
  carry no tune). LAB-TUNE-VIEW's result line says so.
- The stock lap is not keyed by upgrades or driver: accepted; the bonus is
  400 credits once per course at most.
- Merge note: LAB-TUNE and LAB-RESTORE each added `import {labOf}` to
  `app.js`; the second was removed after the merge (fix-forward commit).
