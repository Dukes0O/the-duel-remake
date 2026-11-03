# LAB-CLASSROOM-ALTITUDE

Claude (Director and Release Manager), 3 November 2026. Rebuild order 8 of 15 (LAB-CLASSROOM
section 6), after Braking. Kyle, 31 October: lessons are upgraded in the live game once green,
behind `lab-classroom` (on), with no Preview step.

## What changed

- Air and altitude rebuilt as a classroom lesson: twelve steps in seven parts, script on
  `docs/board/cards/LAB-CLASSROOM-ALTITUDE.md` ("Claude's script"). The steel workshop: the mountain
  side on, drawn to its heights (Sea level 0 m, Panorama Ridge 860 m, Summit Run 2,860 m; ↑ and ↓
  move the stand, or a click on a place); the collective lever as a share, 0 to 100% (W and S, or a
  drag), with the red line at the lever that hovers her at that place; the weighing pad with Kestrel
  One and her load, as in Lift; and an air jar, a 10 by 10 grid holding the bits of air a jar
  scooped there holds (100, 92, 75), beside the sea's jar when it helps.
- The old lesson's faults are gone: the place name and its air are always on the board, and every
  try sets up first, then asks for the guess, then tests it (the audit: the site name was hidden
  while setting up, and following the prompt after predicting turned a right answer wrong).
- Every number is `altitudeBench.run` (the challenge's bench): its near-ground push, 3,887 kg at sea
  (the Lift lesson's own figure), 3,513 kg at the Ridge, 2,777 kg at the summit; the true air in a
  jar, 100, 92 and 75 bits. Weights are the Lift lesson's pad (Kestrel One 1,630 kg, the Dusthawk
  1,280 kg, a crate 500 kg). The lever to hover is weight over push: 42%, 46%, 59%. Fuel is the flight
  rule's burn: 28.8 kg a minute hovering at sea, 34.4 at the summit, 48.0 with the lever all the way up.
- The Dusthawk lifts at sea and stays down at Summit Run, 133 kg too heavy (the wonder and the first
  try); the red line climbs from 42% to 59% (the second try); Brian's job loads four, three and two
  crates at the three places, each too-many and too-few saying why with the kilograms.
- The challenge is unchanged: a 300 kg crate to Summit Run, landed with 30% of the tank left. The
  recap's card and question 3 say its rule (one tank, fly straight there). The Altitude tune reward
  and the save are unchanged.
- New files: `src/lab/lessons/altitude-classroom.js`, `altitude-board.js`,
  `tools/test-lab-classroom-altitude.mjs`, `tools/scenarios/lab-classroom-altitude.mjs`.
  `src/lab/classroom/classroom-lessons.js` lists Air and altitude. The notebook keeps the three
  words under the ids the old lesson saved (`altitude-altitude`, `altitude-air-density`,
  `altitude-thin-air`). The Watch plays `lab.brian.altitude.intro`, the recap
  `lab.brian.altitude.explain`. Sounds: the Lab's tick for each place, its clunk for each crate.

## Removed

- The old Air and altitude lesson: `src/lab/lessons/altitude-lesson.js` and `altitude-animation.js`.
  The rotor stand's 3D model stays: the Lab room still shows it.
- From `tools/test-lab-lessons-flying.mjs`: the altitude packet, its scale-model drawing check and
  its load test. From `tools/scenarios/lab-lessons-flying.mjs`: Air and altitude (carried by
  `lab-classroom-altitude.mjs`). Fire triangle is the last lesson in both.

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-lessons-flying.mjs`: only the removed lesson's packet, drawing and evaluate
  checks left. Its two bench facts (the bench's `aloftLiftKg` is the flying gauge's MAX LIFT, and the
  near-ground push is above it) moved to `tools/test-lab-classroom-altitude.mjs`, unchanged. The fire
  checks are as before. Nothing is loosened.

## Review

(to come)

## Checks

- `tools/test-lab-classroom-altitude.mjs`: 9 of 9 (numbers from the bench and the Lift pad; a child
  following the prompts passes; the words; the tries set up, ask, then test, and a wrong guess says
  why; Brian's job; every wrong answer says why; help climbs to Show me; the board draws, hit-tests
  and points at every target).
- Every `tools/test-lab-*.mjs`: 30 suites, 330 tests, all pass.
- `lab-classroom-altitude` browser scenario, first run: played to the helicopter challenge with 23
  pictures; one browser error loading a voice file (`ERR_NO_BUFFER_SPACE`, the laptop's network
  buffer, not the game). The pictures found the look faults fixed before the second run: the
  mountain read as a beam of light, its title over Summit Run, the watch table's columns ran together
  and covered the lever's title, Brian's bubble after the lever try overflowed, the Space key's name
  was clipped, and the resting helicopter in Brian's job sat across the lever.
