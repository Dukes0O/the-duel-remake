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
