# LAB-CLASSROOM-HEADINGS

Claude (Director and Release Manager), 1 November 2026. Rebuild order 3 of 15 (LAB-CLASSROOM
section 6), after Projectile. Kyle, 31 October: lessons are upgraded in the live game once green,
behind `lab-classroom` (on), with no Preview step.

## What changed

- Headings and maps rebuilt as a classroom lesson: twelve steps in seven parts, script on
  `docs/board/cards/LAB-CLASSROOM-HEADINGS.md` ("Claude's script"). A map from above in 100 m
  squares, north up; Kestrel One on the Woods pad with a compass ring round her; the HEADING gauge
  beside the map in three figures, as in the helicopter. The old map table (a compass that stopped
  at 359, a ruler that took 179 presses) is gone.
- A and D turn her 5 degrees a press, the helicopter's own keys and ways round (D right, the number
  up); held, they keep turning, and past 359 comes 000. Dragging on the ring turns her too. The
  ruler stretches with ← and → in 50 m steps or by dragging its end. Space flies or stops; she
  cruises at 50 m/s with "flown" counting the metres and leaves her track on the map.
- Every heading is the gauge's (`compassBearing`, `compassDirection` in `heli-flight.js`, through
  `benches/headings.js`), and Brian's job is the game challenge itself: smoke at 070, 550 m, within
  its 30 m ring. Writing the script found that the challenge's smoke was placed by the mirror
  reading; HELI-COMPASS fixed that first.
- New files: `src/lab/lessons/headings-classroom.js` (steps and model), `headings-board.js` (board),
  `tools/test-lab-classroom-headings.mjs`, `tools/scenarios/lab-classroom-headings.mjs`.
- `src/lab/classroom/classroom-ui.js`: a step may teach a few words together (`words`): north, east,
  south and west are learnt on one step.
- `src/lab/classroom/classroom-lessons.js` lists Headings and maps.
- The notebook keeps the six words under the ids the old lesson saved (`headings-heading`,
  `headings-north`, `headings-east`, `headings-south`, `headings-west`, `headings-scale`).
- The intro voice line (`lab.brian.headings.intro`, about the map table) no longer fits a step and is
  not played; it stays in the line list. The recap plays `lab.brian.headings.explain`.
- The QA example lesson (`tools/fixtures/lab-lesson-example.js`) borrowed the map table; it moves to
  the fire pit, still on the five-step frame with a helicopter challenge.

## Removed

- The old Headings lesson: `src/lab/lessons/headings-lesson.js` and `headings-animation.js` (with its
  3D map-table toy).
- From `tools/test-lab-lessons-workshop.mjs`: the Headings packet, its prediction grid, its map-fit
  and ruler-skin tests. The bench's tolerances stay tested in `test-lab-benches.mjs`; the lesson's
  own checks are in `test-lab-classroom-headings.mjs`.
- From `tools/scenarios/lab-lessons-workshop.mjs`: the Headings run. Walking to the map table with the
  keys and E, a mouse drag, a missed try with Brian's reason, the notebook words with no progress
  awarded, and the key idea card in the helicopter challenge are carried in `lab-classroom-headings.mjs`.

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-lessons-workshop.mjs`: only tests of the removed lesson went ("all four" packets
  are now three: strength, rust, G-force). Nothing that tests remaining code was loosened.
- `tools/test-lab-lesson-frame.mjs`: the example lesson's id is `fire` now, not `headings` (same
  registry checks).

## Checks
