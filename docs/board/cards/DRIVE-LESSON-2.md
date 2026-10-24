# DRIVE-LESSON-2

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). Packet D2, sections 12.1 and
12.2. Switches `driving-lessons` and `tyre-slip`. Needs DRIVE-LESSON-HOOKS.

The racing line, in `src/lessons/drive-lessons.js` beside lesson 1:

- The lesson row table for `line`: Tremblant Woods Fir Esses 1 and 2,
  Harbour Lights Old Town Esses 1 to 4, start gates and rolling speeds as in
  12.2.
- The instructor's line: outside edge, an apex point 1.0 m in from the
  inside edge at each corner, an exit point 1.5 m in from the outside edge
  after the last, steered with lesson 1's smooth-line steering; speed plan
  at 92% (Casual) and 97% (Pro) from the tyre helper; it counts every cone.
- The middle markers (every 10 m down the road's middle from the start gate
  to the exit), the apex cones and the exit cone.
- Steps: try 1 (middle, counts however it ends, result card numbers), try 2
  (all apex cones, exit cone on the outside half, screech under 0.3 s; the
  first failed rule picks the coach line), the challenge (three in a row,
  instructor's ghost), pass.
- `tools/test-drive-lesson-2.mjs`: on both rows, Casual and Pro, at 30, 60
  and 144 FPS: the instructor's run repeats exactly and counts every cone; a
  scripted right try passes; **the proof:** a scripted middle-line driver at
  the most speed that line allows is at least 0.3 s slower than the
  instructor. A row that fails the proof is dropped from the table with its
  numbers in the change note; if both fail, stop and report.

Owns: `tools/test-drive-lesson-2.mjs`, `docs/changes/DRIVE-LESSON-2.md`.
Hooks: `src/lessons/drive-lessons.js` (new rows and the `line` lesson).
Locks: none. Sound: lines `drive.radio.line.*` (DRIVE-LESSONS-LINES-2),
`lesson.cone`. Art: cones and markers reuse lesson 1's cone.

Acceptance: the test, lesson 1's tests unchanged, lane tier, build, one
review. Removed: nothing.

## Claude answers - the builder's three picks, 24 October

(2) The esses' plan changes (15% of grip held back, corner speed held while the
line curves) and (3) the radio ids are approved; DRIVE-LESSONS-LINES-2 is asked
for an exit-specific racing-line line. (1) Keep the instructor's own speed at the
gate, but at that speed the player must have at least 3 seconds of road between
the gate and the first braking point (Fir Esses at 145 mph needs about 195 m); if
the gate is closer, move it back along the road. A boy of eleven should not have to
brake the moment the lesson starts. Built: the gate search in `linePlanFor`, and a
test of the 3 seconds on both corners and both paces. Fir Esses moves to 585 m
(Casual) and 580 m (Pro); Old Town keeps its gate.
