# DRIVE-LESSON-1

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Codex. Packet sections 3 and 4. Needs TYRE-SLIP (its `steerForYaw`,
`s.tyreSlip` and slip rules) and DRIVE-LESSON-CORE (the shared answer).

Build `src/lessons/drive-lessons.js`:

- The lesson corner table: Panorama Ridge's The Cutting (start gate 180 m
  before turn-in, 100 mph) and Tremblant Woods' Beaver Hairpin (150 m before
  Beaver Kink, 75 mph).
- The instructor's run, owned here: the race rules from the start gate in
  the player's car, steering along the course's planned racing line through
  `steerForYaw`, a speed plan at 92% (Casual) or 97% (Pro) of the speed the
  line allows, braking in a straight line, no slide. It records positions
  for the ghost and the path for the cones. Not the App autopilot.
- `placeCones`: cone 1 where the instructor starts braking (outside edge),
  cone 2 at its closest point to the inside, cone 3 where its line reaches
  the outside edge; the red board 25 m after cone 1.
- `createDriveLesson` and `stepDriveLesson` for the three stages (a late
  try that counts however it ends; the right try with its four rules and a
  brake window from 15 m before to 5 m after cone 1; three in a row), the
  gate-to-gate timer, screech seconds (`s.tyreSlip` above 1.0) and the
  coaching line for the first failed rule.

Owns: `src/lessons/drive-lessons.js`, `tools/test-drive-lessons.mjs`,
`docs/changes/DRIVE-LESSON-1.md`. No hooks, no locks: it reads race state
and never changes it.

Acceptance (tests written first, both corners, Casual and Pro): the
instructor's run is identical every time and at 30, 60 and 144 FPS and
counts all three cones; a scripted late try (brakes at the red board and
keeps braking into the turn) loses at least 0.25 s and screeches at least
0.5 s; a scripted right try passes all four rules; a scripted driver at
100% of the line's speed beats the instructor; a slow attempt resets the
streak. Report cone and board positions and the measured late-try loss and
screech in the change note. If either corner misses the 0.25 s loss or the
0.5 s screech with TYRE-SLIP's numbers, stop and ask Claude rather than
move the red board.
Removed: nothing.
