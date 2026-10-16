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


## Instructor implementation retained, 16 October 08:21 PT

Kyle's follow-up is implemented in the existing lane: clean
`f4e715e4449ca24e9c860b082d4dd6bd15b67038` includes the exact frozen
reviewed Tyre dependency via conflict-free `bfc3c4d6`. This is not a Tyre or
lesson integration merge. `buildInstructorRun` owns a fresh Duel with the
same car/upgrades/driver, rolling start, real fixed-120-Hz rules, settled
92%/97% speed plan, real tyre yaw helper, native pose recording and recorded
brake/inside/first-outside-exit cones. Board min(brake+25m,turn-in) and finish
cone3+60m stay unchanged. Straight road only for braking; actual first brake
is recorded at the pre-step pose; the recorder stops at its own finish and
fails closed on a faulty crossing tick. No App autopilot or saved state.

Four new changed helper cases PASS96.8481ms after missing-export RED;
required independent code/numbers review found real curved-braking,
post-finish-capture and crossing-fault bugs, all fixed/confirmed CLEAR.
The four prepared native course/setting cases and receipt fields are also
review CLEAR but UNRUN: they compare actual repeat-seed poses at30/60/144FPS.
No native drive, lane/build or browser job ran under the full/frame hold.
Prior20stage cases stay passing historical source evidence, not repeated.

Remaining real work: first native instructor result; both-corner/settings
late/right scripted loss/screech acceptance; changed-source lane/build;
Tyre green dependency and final merge, then the separate host/ghost/cone
presentation card. Do not infer success or move the red board. Keep source,
creation receipt and all frozen dependencies; locks[]. Summit full is now
announced455/455PASS and exact runner28640/parent31228 drained. The new
FRAME CHECK STARTING hold is active; no Root heavy starts before its DONE.


## Native work resumed under Kyle's parallel instruction

First actual Panorama/Casual instructor onf4e715e4 failed its clean guard
in1463.8007ms. Actual receipt in owned lane
.evidence/2026-10-16/DRIVE-LESSON-1/first-native-f4e715e4/; no native pass.
Diagnosis bounded until09:23PT, no board/physics/threshold retune.
In parallel worker prepared real native late/right/fast/slow acceptance in
only existing test+note, bcac3baf then9f683e06. Review caught right steering
using pre-override brake; fixed/confirmed CLEAR with actual full-brake yaw
cap. Tests source parse only; every new native case remains UNRUN. Runtime
module remains Root-owned, with diagnostic error facts being added. No save,
App or host edit; no overlapping runtime editor. Old tests/pins exact.

Actual first failure receipt preserved; runtime guard now emits diagnostic state only. No control/threshold change or new native verdict. Current committed runtime diagnostic will be identified in the admitted rerun receipt; native acceptance preparation9f683e06 remains reviewed and unrun.


## Actual input-filter correction,16October09:15PT

Clean888f2725 in owned lesson lane inverses the existing120Hz native
steering filter so the unchanged tyre yaw target reaches steerVisual on
the braking transition. Actual diagnostic6389136d failed t0.883333s,
brake1/command.64/tyreSlip1.018677 with roadvalid; retained steering
through the existing filter explains that demand. New signed plain-value
regression RED then1PASS127.9737ms; required independent code review CLEAR.
No physicalstate overwrite, pace/board/physics/threshold change. Saturated
commands still need actual clean native proof. No corrected native pass yet.
Tyre canonical resumed09:14:02PT on exactclean3e2bf73f, runner7204/
parent38356/session44438; one-minute actual roots3, no overcap. This is
not a Tyre result; receipt remains pending. Root instructor diagnosis bound
is09:23PT; preserve the correction if no admitted native slot by then.
