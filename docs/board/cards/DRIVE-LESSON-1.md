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
  the outside edge; the red board 25 m after cone 1 but never past the
  turn-in point (on Beaver Hairpin it lands at turn-in).
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
counts all three cones; a scripted late try (brakes at the red board,
keeps braking until down to the instructor's corner speed, and steers for
the line with up to full steering, not held to the tyre's best grip)
screeches at least 0.5 s and either finishes at least 0.25 s slower or ends
against the wall or off the road (an unfinished late try counts as losing
time); a scripted right try passes all four rules; a scripted driver at
100% of the line's speed beats the instructor; a slow attempt resets the
streak. Report cone and board positions and the measured late-try loss and
screech in the change note. If either corner misses the 0.25 s loss or the
0.5 s screech with TYRE-SLIP's numbers, stop and ask Claude rather than
move the red board.
Removed: nothing.


## Independent source slice while the dependency waits

Kyle directly asked Root to keep building other work during Summit tests. Start only this card independent pure lesson-rules/cone-tracking slice now, with tests written first in its named files. It reads plain car views and does not import or change physics, App, renderer, saves or shared files. TYRE-SLIP stays an unmet final acceptance/merge dependency; no instructor simulation, late-versus-right acceptance, native gate/build or usable feature is claimed before that dependency is green. The instructor run, actual cone placement from it, both-corner FPS/late-screech/time acceptance and later hooks remain unfinished. Existing shared lesson-core is merged. No shared lock or heavy job is needed for source writing.

Source activity replaces Root frozen GP/Yeti/Tyre editors; no course lane. Other chat QA/earned cars and Claude Rescue/variant source retain ownership. Existing Enzo is frozen for timing, Wild is donor-held; do not start their work. Named new lane only, preserve every retained lane.


## Independent source frozen, 16 October 08:09 PT

Owned lane `drive-lesson-1` / `codex/drive-lesson-1` is clean at
`cca352a4de30a61994fa3df5a378e6176e1d1f7f`. The real pure attempt rules and
swept cone tracking are implemented, with 20 plain-data tests passing in
111.1817 ms. Required independent code/numbers review found gate-origin and
false-coaching faults; both fixed and confirmation CLEAR. Follow-on elapsed
time and challenge-summary fixes are also confirmed CLEAR. No simulation,
App, renderer, storage, reward, design-number or existing-test change.
No gate/build/native/browser job started during the release full hold.

Keep the unfinished lane, source and creation receipt. No locks remain.
TYRE-SLIP is still an unmet dependency. Instructor simulation, cone placement
from native poses, both-corner Casual/Pro FPS and late/right acceptance,
lane gate/build and merge remain unfinished. This is source progress, not a
usable lesson or native pass. Resume this card after dependency/admission;
do not recreate or rerun the unchanged pure checks.


## Kyle authorizes instructor source ahead of dependency tests, 08:12 PT

Kyle directly asked to keep building the instructor run without waiting for
Tyre Slip's tests. Resume the existing owned lane for actual instructor source
and cone placement in the same named files. Combine the exact reviewed frozen
Tyre candidate as a dependency in this isolated lane if needed; do not merge
Tyre into integration or claim it green. Final native driving acceptance,
lane/build and integration merge still wait for Tyre and release admission.
No heavy execution while Summit's exclusive hold remains active. No shared
physics/App/save edit or extra source lane is needed.
