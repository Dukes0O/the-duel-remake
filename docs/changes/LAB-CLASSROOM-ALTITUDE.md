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

One independent review (a separate agent reading the code, checking every number with node, and
walking every step with Back, jumps, Watch again, slow motion and Show me) found no dead end and
every number right; the pass cannot come early; the changed assertions are a move, not a loosening.
Its findings, all fixed: two real faults, where Brian's pointer for "lift off" landed on a crate once
two or more were on (a click took a crate off), and a click on a place's name did nothing (only its
line took clicks). Small ones: Previous step to a finished word showed an empty bubble; the keys
drawn on the board (Space, 1, 2) did not take clicks; one drag past the red line climbed the help two
rungs; question 3 and a key idea gave the pad's lever and fuel figures as the game's flight (now
"by the pad", "more still in flight"); the Watch said its finding before the table filled on a
replay; a stale line after Show me in Brian's job. Its test points: two checks that could never
fail are gone, and the board test now clicks where the pointer is on every step and with two to
five crates on. Writing that test found one more fault, fixed: after Watch again the Watch never
reached its end.
## Checks

- `tools/test-lab-classroom-altitude.mjs`: 10 of 10 (numbers from the bench and the Lift pad; a
  child following the prompts passes; the words; the tries set up, ask, then test, and a wrong guess
  says why; Brian's job; every wrong answer says why; help climbs to Show me; the board draws and a
  click where the pointer is does what the pointer shows, with two to five crates on; the review
  fixes). With `test-lab-classroom` and `test-lab-lessons-flying`: 31 of 31 after the review fixes.
- Every `tools/test-lab-*.mjs`: 30 suites, 330 tests, all pass (before the review fixes).
- Lab browser scenarios, 21, with the lane tier alongside: 20 passed, including
  `lab-classroom-altitude` (23 pictures: keyboard and one drag of the lever, Show me taking the stand
  up, the reasons with the kilograms, the helicopter challenge with its card). `lab-classroom-wax`
  timed out inside its long helicopter flight, as on 2 November under load (a page call, not a failed
  check). After the review fixes, `lab-classroom-altitude` and `lab-classroom-wax` alone: both pass.
- The first browser run had one browser error loading a voice file (`ERR_NO_BUFFER_SPACE`, the
  laptop's network buffer, not the game); its pictures found the look faults fixed before the second
  run: the mountain read as a beam of light, its title over Summit Run, the watch table's columns ran
  together and later covered the jar, Brian's bubble after the lever try overflowed, the Space key's
  name was clipped, the resting helicopter in Brian's job sat across the lever, and the fuel row's
  name ran into its number.
- Lane tier (`--changed --jobs 4`) on 1fc8d398: 40 of 40. `npm run build` passes.
