# LAB-CLASSROOM-DOWNFORCE

Claude (Director and Release Manager), 3 November 2026. Rebuild order 10 of 15 (LAB-CLASSROOM
section 6), after Fire triangle. Kyle, 31 October: lessons are upgraded in the live game once
green, behind `lab-classroom` (on), with no Preview step.

## What changed

- Downforce rebuilt as a classroom lesson: twelve steps in seven parts, script on
  `docs/board/cards/LAB-CLASSROOM-DOWNFORCE.md` ("Claude's script"). One scene in the steel
  workshop: the wind tunnel, with the fan on the left blowing smoke past the Falcone F42, which faces
  into the wind on a scale, a wing on a stand over its back and a rope from its nose to a post with a
  gauge. The smoke bends up behind a tilted wing; a green arrow shows the push down, an orange one the
  drag. The fan dial (↑ ↓, 10 mph a press) and the wing panel (← flatter, → steeper: Flat, Tilted,
  Steep) sit on the right, each with its value; below, a close-up for the words, the runs table, or
  Brian's course.
- The old lesson's faults are gone (the audit: "keep the wing steep" started flat again, a held arrow
  showed "73.4666 mph", the third try was met before it began). The dial and the wing carry from step
  to step, every number is rounded, and each try starts away from its answer.
- Wonder: the car on the scale reads 1,250 kg; the fan comes on at 100 mph and it reads 1,475 kg with
  nothing touching it. Words: tilt the wing steep and watch the smoke (a plane's wing the other way
  up); run the fan at 50 mph and the scale reads the 56 kg push (downforce); the rope's gauge reads
  30 kg (drag). Watch: 50, 100, 150 mph, 56, 225, 505 kg. Tries: the tilted wing from 60 to 120 mph
  (guess twice, four or eight times: 40 kg to 162 kg); then guess which wing keeps the most top speed
  and run all three at 100 mph (drag 81, 101, 122 kg; top speed 201, 187, 176 mph).
- Brian's job: three courses, the fan set to each one's speed; pick the least wing that holds, since
  every bit of wing costs top speed. A 100 mph bend that needs 100 kg (tilted, 112 kg), a 70 mph bend
  that needs 100 kg (steep, 110 kg: a slower bend needs more wing for the same push), one long straight
  (flat, 201 mph). Too little slides wide, too much or a wing on the straight says what it cost; the
  car drives each course on the board.
- Every number is the downforce bench's own (`downforceBench.run`, `downforce()`), the bench the
  challenge passes on. The car on the scale is the bench's car (`tunnelCar`, the Falcone F42, 1,250 kg,
  201 mph), its top speed scaled by the bench's `topSpeedShare`. Question 3 is the Tune page's own line
  (`effectLine('wing', 2)`).
- The challenge is unchanged: the bench's goal (a wing at 50 mph and at 100 mph), passed on the
  lesson's own fan runs; the pass opens Wing angle on the Tune page. The save is unchanged.
- New files: `src/lab/lessons/downforce-classroom.js`, `downforce-board.js`,
  `tools/test-lab-classroom-downforce.mjs`, `tools/scenarios/lab-classroom-downforce.mjs`.
  `src/lab/classroom/classroom-lessons.js` lists Downforce. `src/lab/benches/tunnel.js` names the
  tunnel's car (`tunnelCar`) and reads a force as kilograms (`kgForce`). The notebook keeps the three
  words under the ids the old lesson saved (`downforce-word-0` to `-2`). The Watch plays
  `lab.brian.downforce.intro`, the recap `lab.brian.downforce.explain`. Sounds: the Lab's tick (dial)
  and clunk (wing).

## Removed

- The old Downforce lesson: `src/lab/lessons/downforce-lesson.js` and `downforce-animation.js`; the
  tunnel picture's wing drawing in `tunnel-packet.js` (only Downforce drew it); the wing, scale and
  wing stand from the parts the 3D tunnel takes out of its model (`tunnel-model.js`). The tunnel model
  file stays: Grip and Suspension still use it, and it goes when they are rebuilt.
- Downforce's part of `tools/test-lab-lessons-tunnel.mjs` (its packet, its verdict, the wing chord
  test) and of `tools/scenarios/lab-lessons-tunnel.mjs` (now Grip and Suspension); that scenario's
  shared driver is no longer exported, since `lab-tune-view` now passes Downforce through the
  classroom (`passDownforce` in `lab-classroom-downforce.mjs`).

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-lessons-tunnel.mjs`: the Downforce packet, its verdict and the "air crosses the wing
  chord" test go with the lesson they tested (removed behaviour). The choice-reversal test still runs
  on Suspension. Nothing left is loosened.
- `tools/scenarios/lab-tune-view.mjs`: it opened the wing by passing the old five-step Downforce lesson;
  it now passes the classroom by keyboard (`passDownforce`). Every Tune page and tuned-lap check after
  that is unchanged.

## Review

## Checks
