# LAB-CLASSROOM-STRENGTH

Claude (Director and Release Manager), 2 November 2026. Rebuild order 6 of 15 (LAB-CLASSROOM
section 6), after Fuel and weight. Kyle, 31 October: lessons are upgraded in the live game once
green, behind `lab-classroom` (on), with no Preview step.

## What changed

- Strength against weight rebuilt as a classroom lesson: twelve steps in seven parts, script on
  `docs/board/cards/LAB-CLASSROOM-STRENGTH.md` ("Claude's script"). The steel workshop: a vice
  clamps a test bar or a hook arm side on, half a metre long and drawn as thick as it really is,
  with its load at the tip (10 kg weights, the ram, or the 2,000 kg car on its sling). Two gauges
  beside it: Strength used (red at 100%, where it bends for good or snaps, green up to Brian's
  safety line) and Dips (with the hook's 10 mm line). A rack picks the material (1, 2, 3 or a
  click) and the thickness handle moves 10 mm a press (↑ and ↓, held or clicked); the arm's
  material, thickness and weight are always written on it and on its card. Space hangs the car.
- The old lesson's three faults are gone: the thickness and the weight show all the time (the old
  handle moved 1 mm a press with no number), every step is in the prompt (the old "hang the load"
  button was never named), and carbon fibre never bends for good: it snaps.
- Every number is the strength bench's own (`loadBar` and `hookArm`, the challenge's bench): three
  1 kg bars 6.4, 18.5 and 31.3 mm thick; steel bends for good at 14 kg, aluminium at 128 kg, and
  carbon fibre snaps at 1,991 kg; under 10 kg the steel bar dips 23.7 mm and the carbon fibre bar
  0.3 mm. On the 2,000 kg hook arm, steel holds from 80 mm (18.8 kg), aluminium from 80 mm
  (6.5 kg) and carbon fibre from 50 mm (2.4 kg, the lightest arm that holds). Every failed arm says
  why with its own numbers: past 100% (bent for good, or snapped because carbon fibre is brittle),
  over Brian's line (two thirds for metal, a third for carbon fibre), or a dip over 10 mm.
- The tries follow set up, guess, run: Too thin asks for a guess from three pictures of results
  (holds, bends for good, snaps) before the car goes on a 20 mm carbon fibre arm. Brian's job lists
  every arm that held and the lightest so far, and passes on the lightest arm that holds.
- The challenge is unchanged: the bench's goal (an arm that holds 2,000 kg within 15% of the
  lightest). The lesson's own hook-arm hangs are fed to it through `onChallenge` (`benchAttempts`,
  the path Fuel opened); "Finish the lesson" passes it and Brian says the Heavy hook is in the Lab
  shop (hook limit 2,000 kg, up from 1,500 kg).
- New files: `src/lab/lessons/strength-classroom.js` (steps and model), `strength-board.js`
  (board), `tools/test-lab-classroom-strength.mjs`, `tools/scenarios/lab-classroom-strength.mjs`.
- `src/lab/classroom/classroom-lessons.js` lists Strength against weight.
- The notebook keeps the six words under the ids the old lesson saved (`strength-strength`,
  `strength-stiff`, `strength-brittle`, and at the Watch `strength-aluminium`, `strength-steel`,
  `strength-carbon-fibre`). The Watch plays `lab.brian.strength.intro`, the recap
  `lab.brian.strength.explain`.

## Removed

- The old Strength lesson: `src/lab/lessons/strength-lesson.js` and `strength-animation.js`.
- From `tools/test-lab-lessons-workshop.mjs`: the Strength packet, its hook-arm prediction test, its
  3D rig thickening test and its bar-force checks (all tested the removed lesson). Rust and G-force
  are tested as before. The prop list check on `workshop-lesson-props.glb` is unchanged; its
  `aluminium-bar` and `carbon-bar` props are now loaded by nothing and leave with that file when the
  last workshop lesson (G-force, order 13) is rebuilt.
- From `tools/scenarios/lab-lessons-workshop.mjs`: Strength from the list and its drag helper; the
  lesson by keyboard and mouse, the notebook words with no progress awarded and the pass are carried
  in `lab-classroom-strength.mjs`.
- `tools/scenarios/lab-view.mjs` and `lab-walk.mjs` reach the bending rig from the walking room as
  before and now expect the classroom; `lab-view` plays it through with the new scenario's
  `playThrough` and still buys the Heavy hook for 2,000 credits.

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-lessons-workshop.mjs`: only the removed lesson's tests and checks left; the Rust
  and G-force packets and every asset check are as before. Nothing that tests remaining code was
  loosened.
- `tools/scenarios/lab-view.mjs`, `lab-walk.mjs`: the old lesson panel's text checks became the
  classroom's step checks; the "no old bench panel" check, the "shows above the walking room"
  check, the lesson-alone-never-passes check (now in `playThrough`, before Finish) and the Heavy hook
  purchase all stay.

## Review

## Checks

## Follow-up

- Carbon plates (1,500 credits) is sold in the Lab shop after this lesson, but nothing in the game
  reads it: armour weighs the same with or without it. Brian does not mention it. A card should wire
  it (every Wasteland armour kit 40% lighter, docs/LAB.md 4.2) or take it out of the shop.
