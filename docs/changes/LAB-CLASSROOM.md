# LAB-CLASSROOM

Claude (Director), 31 October 2026. Kyle: the pendulum lesson was "super
janky" and "Brian doesn't really help much yet"; make the Lab a classroom.
Switch `lab-classroom`, dev: Kyle and Gratian try it in the Preview first.

## What changed

- Audit of every Lab lesson and the teaching design: `docs/board/cards/LAB-CLASSROOM.md`
  (sections 1 to 3, 6 and 7); `docs/LAB.md` section 13 points to it.
- The pendulum rebuilt as a classroom lesson: thirteen steps in seven parts
  (Wonder, Words, Watch, Try with help, On your own, Check, Recap), a 2D board
  at true scale and real speed, set-up before the guess, guesses shown as
  stopwatch results, wrong guesses explained with the real swing times,
  every control a thing on the board with its key, keyboard alone or mouse.
- Brian as tutor beside the board: his portrait rendered from his Lab model,
  help that climbs (nudge, plain step, his pointer on the exact control), an
  offer of help after 12 s stuck and a first hint after 25 s, sparks and the
  bonus sound for right answers, his recorded intro and explain lines.
- New files: `src/lab/classroom/` (frame, screen, lesson list, portrait, css),
  `src/lab/lessons/pendulum-classroom.js` and `pendulum-board.js`,
  `tools/test-lab-classroom.mjs`, `tools/scenarios/lab-classroom.mjs`.
- `src/lab/lesson-ui.js` opens the classroom for a listed lesson when the
  switch is on; the old panel is untouched when it is off.
- `start-preview.bat` requests `lab-classroom`, so the Preview shows it.
- Board: LAB-CLASSROOM, LAB-CLASSROOM-LIVE and fifteen LAB-CLASSROOM-<lesson>
  cards in rebuild order (Lift first, ready for Codex).

## Removed

- Look round 1's blueprint and chalkboard palettes and the QA palette switch
  in `tools/menu-check.js`, after the steel pick (same change).
- The old pendulum lesson (`pendulum-lesson.js`, `pendulum-animation.js` and
  their parts of the Flying tests and scenario) stays while the switch is dev,
  because the switch-off path and the notebook words still use it. LAB-CLASSROOM-LIVE
  removes it when the switch goes on.

## Changed assertions (Claude's review, rule 18)

- `tools/test-feature-flags.mjs`: the switch count 44 to 45 and `lab-classroom`
  added to the list that must stay dev. A new switch, nothing loosened: the
  test now also fails if `lab-classroom` leaks on.

## Checks

RESULTS
