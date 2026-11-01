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
- Board: LAB-CLASSROOM-LIFT claimed by Claude (Codex paused until about 4 November).

## Removed

- From `pendulum-board.js`: its own copies of the theme, background, text, key caps, Kestrel One,
  the Dusthawk, the outdoor scene, text wrapping and the board fit, now in `board-art.js`.

## Changed assertions

None.

## Checks

(filled in below as they run)
