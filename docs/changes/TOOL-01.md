---
task: TOOL-01
status: review
kind: tooling
flag: none
player_facing: no
---

## What changed

`node tools/combat-balance.mjs` runs 18 fixed-seed, memory-only Wasteland
races: six weapon policies at Easy, Medium, and Hard CPU difficulty. It prints
win rates, time gained by each policy, shots and hits, and CPU hits by
difficulty. A separate 26-shot crossbow probe follows moving rivals on all 11
combat courses. A ten-speed bomb probe measures the worst loss from the
  thrower's own bombs, including the four speeds named for BUG-05.
  `--verbose` prints individual cases.

`--check` fails when the first 12 races take two minutes or more, a race does
not complete, or the measured UFO, crossbow, own-bomb, or CPU-hit values miss
the combat targets in `SPEC.md` section 13. The probes are repeatable
headless measurements; full-race crossbow opportunities are also printed
because the baseline race produces too few shots to judge accuracy alone.

## Baseline evidence

- 18 races completed. First 12 took 31.88 seconds in a concurrent lane run;
  the whole report took 65.53 seconds.
- UFO whenever ready gained 9.87 seconds over two laps, above the 4-second
  target. Own bombs caused up to 68.37% speed loss across the final
  20–200 mph sample, above 15%. Medium CPU landed one hit, below the 2–6
  target.
- The moving-target crossbow probe hit 13 of 26 shots (50%) within 120 m.
  The three full-race crossbow policies fired just one shot in total. This
  probe does not close BUG-06's real-race feel and accuracy work.
- `node tools/combat-balance.mjs --check` exits nonzero on the known UFO,
  self-bomb, and Medium CPU failures. These are pending BUG-04, BUG-05, and
  BUG-07, not test failures in the report tool. The final run took 28.79
  seconds overall; its first 12 races took 12.71 seconds.
- `node --check tools/combat-balance.mjs` and `git diff --check` passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 152/152 suites
  passed in 240.25 seconds. The production build passed with its existing
  large rendering chunk warning.

## Review

The report is ready for independent review before integration. No game code
or existing assertions changed.
