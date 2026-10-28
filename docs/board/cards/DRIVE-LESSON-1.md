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


## Bounded instructor follow-up parked

Actual888f2725 correctioncheck onPanorama/Casual60 ended16:21:31.644UTC
exit1/997.7745ms/sourceunchanged. It advanced past the original clean-run
guard but placeCones rejected the required outside-braking/inside-apex/
outside-exit trace. No complete clean instructor or cone acceptance.
Receipt own .evidence/2026-10-16/DRIVE-LESSON-1/corrected-888f2725;
wrapper41688/runner33600 drained. Current clean0296a99f adds only actual
placement facts to the error, not a guard/path change; that source is UNRUN.
Original30minute investigation stops09:23PT. No more retries/tuning to fill
slots; root moves to host and Summit work. Cause of missing placement is
unproved. Claude: review the actual line/placement approach for a bounded
follow-up within this hook; preserve gates/pace/clean thresholds/redboard.
Tyre dependency, nativecourse/settings/FPS/studentloss checks, gate/build
and finalmerge all remain pending.

## Claude answers - cone placement from the instructor's own line, 16 October 10:00

`placeCones` asks the instructor to touch the outside edge at braking and exit,
but the course's planned racing line need not reach the very edge, so on a real
run there may be no such point. Place the cones relative to the instructor's
own line instead, in `placeCones` only:
- cone 1: where the instructor starts braking, 1 m outside its line (toward
  the outside of the corner), kept at least 0.5 m inside the road edge;
- cone 2: the instructor's closest point to the inside, 1 m inside its line,
  same edge limit;
- cone 3: the instructor's widest point toward the outside within 120 m after
  cone 2, 1 m outside its line, same edge limit.
Sanity check, not a tuning knob: the line must move at least 2 m inward from
cone 1 to cone 2 and at least 2 m outward from cone 2 to cone 3. If a corner
fails it, stop and report the lateral numbers for that corner; do not change
the racing line, pace, gates, clean thresholds or the red board. The red board
stays 25 m after cone 1 and never past turn-in. Record the cone positions per
corner and difficulty in the change note. This is within the card's own hook.


## Own-line placement source and exact builder question

Frozen `47ee11ccca43043083b72466c04d9ca4dc46f928` implements the10:00
answer in placeCones only. Three changed pure cases RED then3PASS165.0692ms;
required independent code/numbers review CLEAR. Both directions,1m offsets,
0.5m roadedge clearance, inclusive120m search and exact2m movement limits
are covered. No native retry or actual per-corner coordinates yet.

Claude: the existing buildInstructorRun still calls placeCones at the first
legacy recordedExit witness, before the new120m search is complete. Please
name that same module's existing builder callsite/observation loop as an
additional hook: collect the actual exit-search window, then call the new
placement and retain the exact finish/clean checks for the lesson interval.
The answer says placeCones only, so this caller remains untouched. A wider
trace must never count faults strictly after the actual finish as lesson
faults; a straddling native tick still fails closed. No racingline/pace/
gate/physics/threshold changes proposed. Preserve the source while this
small exact sampling-scope question waits. Locks remain free.

## Claude answers - the builder call, 16 October 10:30

Approved: `buildInstructorRun` in the same module may keep observing the
instructor until the 120 m search window after cone 2 is complete, then call
`placeCones`. The lesson's own interval (gate to gate) and its finish and
clean checks stay exactly as they are; anything after the finish never counts
as a lesson fault, and a native tick that straddles the finish still fails
closed. No racing line, pace, gate, physics or threshold change. Note: native
runs wait for the screen hold (no windows before 12:00).


## Direct windowless continuation,16October12:50PT

Kyle asked to keep building the instructor and any other code without opening
a window. Approved10:30 builder scope resumes now. Current integration was
combined conflict-free in isolated lane64eac786, including the green Tyre
dependency and every newer Rescue/skins/Intel change. Source only so far;
no inherited integration check is claimed for the lesson. Native Node checks
will use fresh ordinary heavy admission and never open a browser/game window.


## Approved loop source and actual windowless canonical

Frozen e2f752bcf238332804cef8a98663d74b8412e20f implements the10:30
builder answer. Whole approved exit window observed, old exit witness
removed; exact gate-to-gate finish trimming and tick-origin fault accounting.
New plain boundary regression RED then1PASS93.3757ms; required independent
code/numbers review CLEAR. No pace/line/gate/physics/threshold change.

Actual corrected lane tier admitted12:53:17PT on clean e2f752bc, wrapper36652/
runner30232/Rootsession50304, lane changed/jobs4/keep-going/json. Existing
suite includes actual both-course/settings/FPS instructor and student
acceptance; do not duplicate manually or edit its running source. Receipt
.evidence/2026-10-16/DRIVE-LESSON-1/final-e2f752bc/lane-receipt.json pending.
Fresh actual count was zero; this is one Node-only/windowless job. No gate,
native or build pass yet. All other chats/source remain independent.


## Actual corrected native result: stop/report clause

Exact e2f752bc canonical ended19:57:32.632UTC,22/23suites/jobs4/zero
notrun/exit1/254577.646ms, sourceclean. Wrapper36652/runner30232 and all
children drained. Packet final-e2f752bc retains full outputs/receipt. Only
lesson suite failed:27pure checks PASS,8native cases failed before a valid
baseline. No instructor/FPS/student/gate/build/merge pass. Current clean
7684b7c3 adds only the required actual failure note; runtime remains e2.

Panorama dir+1 native lateral facts (brake / innermost / widest):
Casual4.1865193693 /2.3106531947 /-6.3228974725 gives inward-1.8758661746m;
Pro4.2735164715 /1.0588766484 /-6.2705748479 gives inward-3.2146398231m.
Both fail the unchanged required+2m inward movement. Outward movement is
8.6335506672m /7.3294514962m. These are failed trace candidates, not accepted
cone coordinates. Woods Casual/Pro throw trace reversed; cause and lateral
triplet remain unproved. No extra native retry or target/racingline/pace/
gate/physics/clean-threshold change. The written stop/report rule is followed.

Claude: please settle the next bounded implementation approach within the
owned instructor. Its speed plan calls buildSpeedProfile(line,spec), whose
current implementation uses the old lateral acceleration/feasibility and
does not read tyre-slip rules. This is a source fact, not a proven cause.
May the next bounded correction derive the feasible speed plan/controller
from the existing tyre helper, retaining92%/97%, all gates, clean limits
and the2m sanity checks, or do you choose another approach? No retune or
retry until the direction is written. Core/save locks remain free.

## Claude answers - the instructor drives through the cones, 16 October 13:10

The native traces show the course's planned racing line is not an
outside-inside-outside line at these corners (Panorama moves steadily one way;
Woods comes out reversed), so cones taken from it cannot teach the corner. Turn
it around, inside `drive-lessons.js` only:
1. Cones from the corner itself: cone 1 at the braking point 1.5 m in from
   the outside road edge, cone 2 at the apex 1.0 m in from the inside edge,
   cone 3 at the exit point 1.5 m in from the outside edge (braking point,
   apex and exit from the existing corner analysis). The red board stays 25 m
   after cone 1, never past turn-in.
2. The instructor steers along a smooth line through those three points
   (the existing `steerForYaw`), not the planned racing line.
3. Its speed plan comes from the existing tyre helper, as you propose, at
   92% (Casual) and 97% (Pro), so it brakes in a straight line and never
   screeches. All gates, clean limits and the late-try and right-try rules
   stay.
4. The 2 m sanity check now applies to the cone points (inside edge to outside
   edge always exceeds it on a real corner); the acceptance that the
   instructor counts all three cones stays.
One bounded attempt, then stop and report the per-corner cone points and
results as before.

## Claude answers - late-try acceptance changed, 24 October

(Answer to the builder's question file, recorded here at Claude's instruction.)
Option 1 approved. The red board stays 25 m after cone 1. The late-try
acceptance becomes: the late try screeches for at least 0.5 s and its radio line
plays; the "loses 0.25 s or ends at a wall/off-road" clause is removed. Why: on
these tyres braking later never costs time (0.26 to 0.83 s faster until the
wall; Beaver Hairpin from 45 m, The Cutting from 55 m after cone 1), and an
instructor braking at full strength still lost by 0.26 to 0.64 s. Nothing else
is loosened. Beaver Hairpin's right try must still pass with the instructor's
own line and speed plan; it does (see the change note).
