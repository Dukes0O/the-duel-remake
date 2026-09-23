---
task: TOOL-01
status: merged
kind: tooling
flag: none
player_facing: no
---

## What changed

`node tools/combat-balance.mjs` runs 21 fixed-seed, memory-only Wasteland
races: seven weapon policies, including maximum-level UFO, at Easy, Medium,
and Hard CPU difficulty. Thirty no-weapon races across ten seeds measure the
standard autopilot's win rate by difficulty. The report also prints time gained
by each policy, shots and hits, and CPU hits on the player by difficulty. A
separate 26-shot crossbow probe follows moving rivals on all 11 combat
courses. A ten-speed bomb probe measures the worst loss from the thrower's
own bombs, including the four speeds named for BUG-05.
  `--verbose` prints individual cases.

`--check` fails when the first 12 races take two minutes or more, a race does
not complete, or the measured UFO, crossbow, own-bomb, or CPU-hit values miss
the combat targets in `SPEC.md` section 13. It checks each CPU difficulty
separately for stock and maximum UFO levels. The probes are repeatable
headless measurements; full-race crossbow opportunities are also printed
because the baseline race produces too few shots to judge accuracy alone.

## Baseline evidence

- The first version completed 18 policy races. Its first 12 took 31.88 seconds
  in a concurrent lane run; the whole report took 65.53 seconds. The expanded
  version with maximum UFO and ten-seed win rates is measured on integration.
- UFO whenever ready gained 9.87 seconds over two laps, above the 4-second
  target. Own bombs caused up to 68.37% speed loss across the final
  20–200 mph sample, above 15%. Medium CPU landed one hit, below the 2–6
  target.
- The moving-target crossbow probe hit 13 of 26 shots (50%) within 120 m.
  The three full-race crossbow policies fired just one shot in total. This
  probe does not close BUG-06's real-race feel and accuracy work.
- The first `--check` exited nonzero on the known UFO, self-bomb, and Medium
  CPU failures. These are pending BUG-04, BUG-05, and BUG-07. That run took
  28.79 seconds overall; its first 12 races took 12.71 seconds.
- `node --check tools/combat-balance.mjs` and `git diff --check` passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 152/152 suites
  passed in 240.25 seconds. The production build passed with its existing
  large rendering chunk warning.

## Review

Independent review found that enemy bomb hits on the rival or traffic were
being counted as CPU hits on the player. Combat events now carry an explicit
victim (`0c8eb59` on the CMB lane); the report counts only player victims and
fails closed if it sees an unattributed enemy hit. Review also found that an
average UFO gain could hide an overpowered difficulty, so `--check` now
compares every difficulty at stock and maximum level. The win-rate output is
based on ten independent no-weapon seeds per difficulty rather than a fraction
of wins across weapon policies. No existing assertions changed.

## Integration measurement

On the exact integration commit `5cf591e`, 21 policy races and 30 no-weapon
baseline races finished in 100.82 seconds. The first 12 took 22.44 seconds.
No-weapon win rates were 10/10 Easy, 10/10 Medium and 0/10 Hard. Stock UFO
gained 8.57, 8.58 and 12.45 seconds on Easy, Medium and Hard; maximum UFO
gained 25.29, 25.30 and 29.17 seconds. Crossbow hit 13/26 moving-target
shots (50%). Own bombs caused 68.37% maximum speed loss. CPU hits on the
player were 1, 1 and 3. `--check` correctly exited nonzero for the UFO,
own-bomb, Medium CPU and Hard CPU targets. These are combat balance gaps,
not failures of the report tool.

The exact integration commit passed 147/147 merge suites in 200.96 seconds,
the production build, and private High/Performance browser smoke on port
48918 with four screenshots and zero warnings or errors.
