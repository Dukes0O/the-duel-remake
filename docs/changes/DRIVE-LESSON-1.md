# DRIVE-LESSON-1: independent lesson rules

## Built

The first source slice implements the two settled corner rows and the late,
right and three-in-a-row attempt rules. It reads plain car views, clips the
gate timer at crossings, measures screech and continuous off-road time, and
tracks swept cone counts and once-per-attempt cone tips (`lesson.cone`).
The right try checks the original four rules in order. Coaching uses the
shared six-second interval. A failed physical attempt never blames a rule
that passed. Starts beyond the gate and zero-time movement are rejected.
Only the lesson object changes; car views, authored plans and player state
stay untouched. The output names existing radio lines; it plays no audio.

Kyle directly asked Root to continue independent source during Summit's
exclusive release full tier. The instructor run and native acceptance still
depend on TYRE-SLIP. This source increment is not a playable or merged lesson.

## Checks and review

Tests were written before the module: initial missing-module RED, then
11 passing plain-data cases. Additional boundary and review regressions now
pass 20/20 in 111.1817 ms. These checks import no simulation or browser and
consume no heavy slot. Independent code/numbers review found a zero-time
challenge bypass and incorrect braking advice after a physical failure;
both are fixed with regression coverage. Follow-on fixes keep elapsed time
after reversing behind the start gate and align challenge summaries with
its time-only rule. Required reviewer confirmation is CLEAR for all fixes.
No existing assertion, race fingerprint or design number changed.
No gate, build, native simulation, browser or frame job was started here.

## Still unfinished

The actual same-car instructor simulation, native racing-line/steerForYaw
speed plan, `placeCones` from its poses, ghost poses, real cone/board
positions and both-corner Casual/Pro acceptance at 30/60/144 FPS remain.
Late-try screech/time-loss and right-try native results are unmeasured.
TYRE-SLIP remains an unmet acceptance/merge dependency. Do not move its board
or infer native success from these synthetic car views. Lane tier/build
must run once the finished source is eligible and heavy holds have cleared.
DRIVE-LESSON-HOOKS remains a later dependent card.

## Removed

Nothing replaced. No scratch output or copies were created; preserve this
unfinished owned lane and its creation receipt for the next source increment.


## Instructor source increment, Kyle's direct instruction 16 October

Combined exact frozen, reviewed Tyre candidate `3e2bf73f` into this lesson
lane with no conflicts (`bfc3c4d6`); Tyre is not merged into integration and
is not claimed green. Kyle explicitly authorized instructor building ahead
of its tests. The module now includes `buildInstructorRun`, a lazy native
factory: fresh isolated Duel, real race step at 120 Hz, explicit frame
partitioning, the player's car/upgrades/driver and settled rolling start.
No App autopilot, storage, reward or live race access. Casual lessons request
new tyre rules only in this scratch lesson race, as the lesson design says;
released Casual stays untouched. Controls use the existing racing-line
steering law, the real tyre `steerForYaw`, the same-car speed profile at
92% Casual/97% Pro and braking on straight road only. Recorded native poses
supply the ghost path and actual brake/inside/first-outside-exit cones.
The board stays min(first brake + 25 m, turn-in); finish is exit cone + 60 m.
The recorder stops at its own finish and rejects ambiguous faulty final
ticks. It checks the actual native trace against the shared cone counter.

Two new helper tests were written first (missing exports RED), then passed.
Four changed plain-data instructor/cone cases now PASS96.8481 ms, including
curved approach braking and a first exit followed by a later wider point.
The prior 20 unchanged stage cases were not repeated. Source syntax parses.
The independent review found curved-approach braking, capture beyond the
actual finish and ambiguous crossing fault handling; all fixed/confirmed
CLEAR. Final source also records control onset at the pre-step native pose.

**Native execution is still UNRUN.** No heavy gate, build, browser or native
instructor job was launched under Summit's exclusive full. Cone positions,
real instructor time, tyre cleanliness, same-seed/FPS repeatability, late
loss/screech and right-try driving remain unmeasured. Source implementation
is not native acceptance or a playable feature. Do not retune or move the
board if real acceptance fails; use the card's stop/Director decision.


Prepared native tests (UNRUN) now call the actual factory for both courses
and both settings, comparing repeat-seed results at 30/60/144 FPS including
all native poses, board/finish spacing, finite geometry and tyre cleanliness.
They are normal tests, not an opt-in bypass or a new harness. A future file
or canonical lane run is heavy; do not run it during the release hold.
The four new native cases have no pass/fail result yet. Actual late-versus-
right scripted acceptance still follows the first clean instructor result.


## Prepared native student acceptance, parallel source only

The existing test file now prepares fresh native Duel attempts, using the
instructor's actual start and gate/cone plan, same car/settings and fixed
120 Hz controls. For each corner, Casual/Pro and 30/60/144 FPS, it requires:
late braking at the unchanged board, full brake until actual instructor
corner speed and uncapped line steering, at least .5 s real screech and
at least .25 s loss or wall/off-road; a real right try passing all four
rules; a 100%-line-speed driver beating the instructor; a real slower run
resetting an earned streak; then three native faster runs completing it.
All observations go through the existing stage scorer. No state is moved
after the scratch race's authorized rolling start; contact/reset events
and off-road time are measured from the real simulation. FPS results must
match exactly. No App, storage, save, reward, recording or live race API is
used. The host's reward/no-record contract still needs its later hook tests.

This is source preparation only. The helper and four new native cases have
NOT RUN; no success, corner time, cone fit, screech or right-try verdict is
claimed. Node syntax parsing only; Root owns native admission and review.
No module, physics, board, target, old test assertion or runtime hook changed.
No disposable output created or removed.


The independent review found a real preparation fault: right-try steering
had been calculated using the provisional instructor brake before replacing
it with full braking. Its yaw cap now uses the actual requested brake via
the existing steerForYaw helper and the same line-steering law. Late raw
steering already used that actual brake. No target or runtime hook changed.
Syntax parsing/diff check only; all native cases remain unrun pending Root.


First real instructor execution on f4e715e4 failed the existing clean-native
guard (1463.8007ms, Panorama/Casual); receipt and error are retained under
.evidence/2026-10-16/DRIVE-LESSON-1/first-native-f4e715e4/. No native success
is inferred. The guard error now includes actual tick/distance/lateral/speed,
heading/slip/off-road/status/impact and input facts. This changes diagnostic
text only, not a threshold, control, physics or guard result. Source parses;
its one bounded diagnostic rerun awaits admission. All native acceptance
cases remain unrun, and the red board/design thresholds stay exact.


## Actual braking-transition fault

Firstnativef4e715e4 failed its clean guard1463.8007ms. Diagnostic6389136d
failed1200.8345ms with actual t0.883333s/s1552.0649/lateral4.65375,
100.3392mph, brake1, steercommand.64, tyreSlip1.018677, offRoadfalse,
statusracing/impact0. Native steering retains an unbraked input through its
existing exponential filter when full braking reduces available grip.
The owned instructor now inverses that existing120Hz filter to reach the
unchanged steerForYaw target; input clamped[-1,1], no race-state write.
New plain signed transition regression RED then1PASS127.9737ms; required
independent code review CLEAR. Saturation may still prevent an immediate
target, so actual clean instructor and all student native checks remain
UNRUN on this correction. No pace/board/physics or acceptance relaxation.
Original and diagnostic packets retained under own .evidence/2026-10-16/
DRIVE-LESSON-1. Investigation bound remains09:23PT; native check waits capacity.
Removed: no source feature removed; no scratch recipe created.


### Claude's own-line cone placement,16October10:00 answer

Only placeCones changes. Cone1 is1m outside the actual first brakingpose,
cone2 is1m inside the actual innermost linepose, cone3 is1m outside the
actual widest linepose within120m aftercone2 (bounded by the nextcorner).
Everycone stays0.5m inside its real roadedge and groundAt uses its clamped
position. Actual line movement must be>=2m inward AND>=2m outward. The
fixedboard/finish, pace, racingline, gates and clean thresholds are unchanged.
Incomplete exit observations fail rather than choosing an early point.

Changed assertions: the two new own cone fixtures replace the old requirement
that the car cross the centreline/first local outside extremum. Claude's
written design now measures relative line movement and the widest120m point;
no old simulation/hash assertion is edited. Three changed pure cases RED
then3PASS165.0692ms include bothdirections, edgeclamps, exact120m/2mbounds
and incomplete trace refusal. Required independent code/numbers review CLEAR.
No native run,
per-corner real cone coordinates or new acceptance result.

The existing builder still waits for its old recordedExit gate and attempts
placement before the full new search window. Its named callsite/observation
scope needs Claude's answer because this answer explicitly says placeCones
only. It remains untouched; do not treat the pure function as a playablefix.
Removed: old centreline-sign and first-local-extremum placement assumptions
in placeCones. Legacy builder sampling remains pending the named scope.


### Approved builder observation loop,16October12:50PT

Claude's10:30 answer names the existing builder. Current integration/green
Tyre combined conflict-free64eac786. Its actual first Panorama/Casual native
case was RED1078.9836ms: the old caller attempted placement before the new
exit search completed. That receipt is builder-red-64eac786.

The builder now observes the whole same120m apex-relative window (bounded
by the next corner), then chooses the approved cones. Legacy first-exit
witness code is removed. Native faults carry their tick origin. The finish
helper keeps exactly the original gate-to-gate trace/interpolated finish;
faults whose ticks begin before that gate still fail, including straddling
ticks. Unknown origins fail closed. Wholly post-finish faults are excluded.
No racingline/pace/gate/physics/threshold change. New plain boundary case
RED then1PASS93.3757ms; required independent code/numbers review CLEAR.
Actual corrected native/student acceptance and canonical/build follow once
on this frozen source, windowless under ordinary admission. No pass yet.
Removed: obsolete recordedExit and premature placement/whole-observation
fault counting. Existing clean thresholds and all old fingerprints remain.


### Actual corrected canonical result: blocked, not green

Exact e2f752bc source stayed clean/unchanged. Lane tier ended19:57:32.632UTC,
22/23 suites/jobs4/zero notrun/exit1/254577.646ms. Wrapper36652/runner30232
and all children drained. Receipt/full output: own
.evidence/2026-10-16/DRIVE-LESSON-1/final-e2f752bc. No build/merge.

Only test-drive-lessons failed:27 pure checks passed; the4instructor and
4student native cases stopped before obtaining a valid baseline. Therefore
repeat-seed/FPS, student loss/screech/right/challenge and clean instructor
acceptance remain unproved. Actual candidate trace facts, not cone acceptance:

| Panorama setting | first brake lateral | innermost lateral | widest lateral | inward movement | outward movement |
| --- | ---: | ---: | ---: | ---: | ---: |
| Casual |4.1865193693|2.3106531947|-6.3228974725|-1.8758661746|8.6335506672|
| Pro |4.2735164715|1.0588766484|-6.2705748479|-3.2146398231|7.3294514962|

Turn direction+1, so both fail the unchanged required inward>=2m sanity
check. Woods Casual/Pro throw Instructor trace reversed before a plan exists;
no lateral triplet or specific cause is established there. No accepted cone
positions can be reported for either corner. The gate also passed all other
22suites, including its replay/world guards.

Stop/report clause followed: no extra simulation retry, target/racingline/
pace/gate/physics/threshold change. Source inspection only: instructor uses
buildSpeedProfile(line,spec); its current implementation derives corner
speed from old lateral acceleration/feasibility and does not read tyre-slip
rules. Whether that is the cause here is unproved. Ask Claude for the next
bounded controller/speed-plan approach within this owned module, or park.
Failure facts were extracted once; no repeated diagnosis/status-only commit.
