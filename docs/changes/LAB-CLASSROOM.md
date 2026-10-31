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

## Review

One independent code review (rule 17). It found ten things; all fixed:
slow motion now ends with its step; Show me presses the control for the
player and hands the next part back (it only points for the swing tap); a
wrong guess replays both swings; the challenge hand-off is covered by the
scenario and refuses a bench-kind ('inline') challenge with a message;
Watch again works on Brian's crane; leaving a lesson un-pauses the walk at
once; a drag ends on a step change, a lost pointer or a button released
elsewhere; a press that changes nothing is not a mistake, and in the
short-string try the weight stays light so only one thing changes; Lab
buttons focused outside the lesson keep their own Enter and Space; Brian's
portrait renderer is made inside its clean-up. The tests gained checks for
each, and the drawing test now checks every step draws.

## Checks

RESULTS

## Tool note (not a code fault)

In this lane, `tools/test-board.mjs` and `tools/test-lab-lessons-flying.mjs`
fail where they send a fixture folder to the Recycle Bin: Windows refuses
("Attempted to perform an unauthorized operation") for any folder of many
files under this lane's `.qa-dist` or `.evidence`, while the same copy in the
integration folder recycles. The lane folder lacks one sandbox allow entry
that the integration folder has. Both suites pass in the integration folder
and are rerun there after the merge.
