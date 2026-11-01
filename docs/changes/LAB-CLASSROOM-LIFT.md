# LAB-CLASSROOM-LIFT

Claude (Director and Release Manager), 31 October 2026. Rebuild order 1 of 15 after the pendulum
(LAB-CLASSROOM section 6). Kyle, 31 October: "we really don't use the preview anymore. you can
upgrade the lessons in the live game", so this goes live once green, behind `lab-classroom` (on).

## What changed

- Lift and weight rebuilt as a classroom lesson: fourteen steps in seven parts, script on
  `docs/board/cards/LAB-CLASSROOM-LIFT.md` ("Claude's script"). Kestrel One on a weighing pad,
  a collective lever with a kilogram scale that moves a notch (500 kg, one crate) at a time and
  stops on the red line (her weight) when the key is held; lift, weight, the two arrows side by
  side and what the pad feels on screen the whole time. The old 1.5% hover window is gone.
- Every number comes from `padForces` (the helicopter's own `heliMass` and `availableThrust`,
  full tank): 1,630 kg, the Dusthawk 1,280 kg, a crate 500 kg, the most lift 3,887 kg.
- W/S (and the arrows) move the lever, the same keys as the helicopter's collective; a drag or a
  press on the lever moves it, with a click onto the red line; Lever up and Lever down buttons
  for the mouse. Crates, the Dusthawk and the rotor are clicked on the board; hovering names
  every part.
- New files: `src/lab/lessons/lift-classroom.js` (steps and model), `lift-board.js` (board),
  `src/lab/classroom/board-art.js` (the steel look, text, key caps, Kestrel One and the Dusthawk,
  shared with the pendulum board), `tools/test-lab-classroom-lift.mjs`,
  `tools/scenarios/lab-classroom-lift.mjs`.
- `src/lab/classroom/classroom-ui.js`: W, S, ↑ and ↓ keys; a held key repeats only where a lesson
  asks (`repeat` in its view) and is passed on as held; a board can move its drag on the press
  (`pressMovesDrag`); lever buttons when a step has the lever.
- `src/lab/classroom/classroom-lessons.js` lists Lift.
- The notebook keeps the Lift words under the ids the old lesson saved (`WORDS`, including
  `lift-rotor`, which the new lesson teaches inside its Lift step).
- `tools/scenarios/lab-view.mjs` plays the new Lift lesson where it played the old one;
  `lab-walk` checks E at the Lift opens the classroom and its Leave closes it; the QA example
  lesson in `lab-lesson-frame` (`tools/fixtures/lab-lesson-example.js`) borrows the map table, a
  machine still on the five-step frame, instead of the Lift.
- Board: LAB-CLASSROOM-LIFT claimed by Claude (Codex paused until about 4 November).

## Removed

- The old Lift lesson: `src/lab/lessons/lift-lesson.js`, `lift-animation.js` and
  `collective-inset.js`; its CSS (`.lab-lift-gauge`, `.lab-collective-inset`,
  `.lab-collective-views`); `padOutcome` and `kilogramsToRemove` in `lift-pad.js`, which only it
  used; `tools/scenarios/lab-lift-2.mjs`, replaced by `lab-classroom-lift.mjs`.
- From `tools/test-lab-lift-2.mjs`: every test of the removed lesson, its 3D rotor and its
  captions. The test that every pad load reads the helicopter's own flight rules stays (the
  classroom reads the same pad), less its two `padOutcome` lines.
- The old scenario's checks are carried, not dropped: a mouse drag of the lever, the notebook
  words with no progress awarded by teaching, and the key idea card clear of every button in the
  helicopter challenge are now in `lab-classroom-lift.mjs`. Walking up with the keys and E is
  covered by `lab-classroom.mjs`.
- From `pendulum-board.js`: its own copies of the theme, background, text, key caps, Kestrel One,
  the Dusthawk, the outdoor scene, text wrapping and the board fit, now in `board-art.js`.

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-lift-2.mjs`: only tests of the removed lesson went, and two `padOutcome` lines
  of the kept pad test with the function they tested. Nothing that tests remaining code was
  loosened.

## Review

One independent code review (rule 17). It found seven things; all fixed with tests: Show me on
the Dusthawk try now takes off a stray crate before hooking the car (it could unhook the car);
in Brian's job each load change says what is on the hook, so an old "take a crate off" line no
longer stays up; pressing R twice no longer leaves the lever at zero; Watch again works on the
job's result; on the Collective step Brian points at the 1,000 kg mark and Show me finishes the
step even after the lever went down; Question 1's wrong answer gives the load and the total
together; hovering on the pad's dial explains it.

## Checks

- `tools/test-lab-classroom-lift.mjs`: 11/11; `tools/test-lab-classroom.mjs`: 14/14; all 23
  `tools/test-lab-*.mjs` pass (`test-lab-lessons-flying` fails in the lane only on the Recycle Bin,
  see below).
- All 14 Lab scenarios pass. `lab-classroom-lift` plays the lesson end to end (25 pictures,
  looked at as a player: two label overlaps fixed and rerun). `lab-lesson-frame` and `lab-walk`
  failed until moved off the old Lift and pass now.
- Lane tier (`--changed --jobs 4`): 30 passed; `test-board`, `test-course-kit`,
  `test-earned-cars-ui`, `test-lab-lessons-flying` and `test-medals` fail only on this lane's
  Recycle Bin refusal and are rerun in the integration folder on the merged result.
- `npm run build`: passes.
- Rule 19: only Lab code and its tests changed since the full tier on 86c48d4f.
