# DRIVE-LESSON-1

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Codex. Packet sections 3 and 4. Needs TYRE-SLIP (its `steerForYaw`,
`s.tyreSlip` and slip rules) and DRIVE-LESSON-CORE (the contract).

Build the pure lesson module `src/lessons/drive-lessons.js`:

- The lesson corner table (Harbour Lights' Lantern Hairpin, Tremblant
  Woods' Beaver Hairpin; start gates and rolling speeds from section 3.1).
- The instructor's headless run in the player's car (92% of the corner
  limit on Casual, 97% on Pro, `steerForYaw`, no slide), recorded as a
  trace and as ghost poses.
- `placeCones` (cone 1 at the instructor's brake point, cone 2 at its apex,
  cone 3 where it reaches the outside edge; the red board where full
  braking reaches turn-in at 1.25 times the instructor's turn-in speed).
- `createDriveLesson` and `stepDriveLesson` for the three stages (late try,
  right try with its four rules, the three-in-a-row challenge), the attempt
  timer from gate to gate, screech seconds (`s.tyreSlip` above 1.0), and the
  coaching line for the first failed rule.

Owns: `src/lessons/drive-lessons.js`, `tools/test-drive-lessons.mjs`,
`docs/changes/DRIVE-LESSON-1.md`. No hooks, no locks: it reads race state
and never changes it.

Acceptance (tests written first, both corners, Casual and Pro): the
instructor run is identical every time and at 30, 60 and 144 FPS; a scripted
late try loses at least 0.25 s and screeches at least 0.5 s; a scripted
right try passes all four rules; a scripted driver at 100% of the limit
beats the instructor; a slow attempt resets the streak; cone and board
positions are reported in the change note. If the late try cannot lose
0.25 s on one corner with TYRE-SLIP's numbers, stop and ask Claude rather
than move the red board further.
Removed: nothing.
