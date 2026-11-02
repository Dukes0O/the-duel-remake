# LAB-CLASSROOM-WAX

Claude (Director and Release Manager), 2 November 2026. Rebuild order 4 of 15 (LAB-CLASSROOM
section 6), after Headings. Kyle, 31 October: lessons are upgraded in the live game once green,
behind `lab-classroom` (on), with no Preview step.

## What changed

- Ski wax rebuilt as a classroom lesson: twelve steps in seven parts, script on
  `docs/board/cards/LAB-CLASSROOM-WAX.md` ("Claude's script"). Snow trays side on: a 50 m test
  strip at 10 degrees, a thermometer and the snow's name, a stopwatch on each ski at real speed, and
  three labelled wax tins on the bench (HARD, MEDIUM, SOFT; blue, violet, red). 1, 2 and 3 or a
  click pick a tin and the ski's base turns its colour; Space lets the skis go. In the tries your ski
  races a plain ski with no wax, so the right wax wins and the wrong one loses, and the board marks
  how far behind the loser was when the winner finished. The old wax selector, which started on
  Hard so that "pick hard wax" moved it to Medium, is gone.
- Every glide is the ski rules' own friction (right wax 0.045, none 0.05, wrong 0.06) on the bench's
  slope: 8.9 s, 9.1 s and 9.4 s down 50 m. The bands Brian names (-10 °C and colder, -9 to -2,
  -1 to 0) are the game's days as the ski menu rounds them, and Brian's job reads three days in the
  ski menu's own words.
- `src/lab/benches/wax.js`: `glideSeconds` takes a distance (100 m unless told), and `FRICTION` and
  `glideAcceleration` are exported for the lesson (the challenge's rules are unchanged).
- New files: `src/lab/lessons/wax-classroom.js` (steps and model), `wax-board.js` (board),
  `tools/test-lab-classroom-wax.mjs`, `tools/scenarios/lab-classroom-wax.mjs`.
- `src/lab/classroom/classroom-lessons.js` lists Ski wax.
- The notebook keeps the three words under the ids the old lesson saved (`wax-wax`, `wax-glide`,
  `wax-snow-crystals`).
- The intro voice line (`lab.brian.wax.intro`) no longer fits a step and is not played; it stays in
  the line list. The recap plays `lab.brian.wax.explain`.

## Removed

- The old Ski wax lesson: `src/lab/lessons/wax-lesson.js` and `wax-animation.js`.
- From `tools/test-lab-lessons-snow.mjs`: the Wax packet, its prediction grid, its drawings and its
  checks. The challenge's daily rules (the day's snow decides the wax; the wrong wax glides slower)
  stay in that suite, unchanged, under a test of their own.
- From `tools/scenarios/lab-lessons-snow.mjs`: the Wax run and its flight to the Devils drop. The
  lesson by keyboard and mouse, the notebook words with no progress awarded, the flight to the ski
  drop, today's wax and the step into the slalom with the key idea card are carried in
  `lab-classroom-wax.mjs`.

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-lessons-snow.mjs`: only tests of the removed lesson went (the Launch packet is
  tested as before); the daily-rule assertions moved, unchanged. Nothing that tests remaining code
  was loosened.
