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

## Cones from the corner, instructor drives through them (Claude's 16 October 13:10 answer)

Built in `src/lessons/drive-lessons.js` and its test file. Result: **the
instructor drives all four cases cleanly and counts all three cones, the right
try passes on both corners at both paces, and all 36 checks in
`tools/test-drive-lessons.mjs` pass**, after one reviewed assertion change (below).

What changed. The cones come from the corner itself: cone 1 at the braking
point 1.5 m in from the outside road edge, cone 2 at the apex 1.0 m in from the
inside edge, cone 3 at the exit point 1.5 m in from the outside edge. The apex
is the track script's own apex share of the turn; the exit is as far past the
turn's end as the apex is before it; the braking point is where the
instructor's speed plan starts slowing for the corner. The red board is 25 m
after cone 1 and never past turn-in. The 2 m check now applies to the cone
points. The instructor steers a smooth line through the three points with the
existing `steerForYaw`. Its speed plan comes from the existing tyre helper
(`tyreSlipSteering`) at 92% (Casual) and 97% (Pro): the fastest speed at which
the line's bend stays inside the tyre's yaw limit (4% held back for steering
feedback), corner speed held from turn-in to the exit cone, straight-line
braking before the corner (80% of full braking), a light brake (under the 50%
rule) for an earlier bend such as Beaver Kink, and 75% of the helper's
acceleration (the car does not reach all of it at speed; at 100% the car ran
about 6 mph under the plan and its first firm brake came 5.4 to 5.9 m after
cone 1, outside the +5 m window). Gates, clean limits and the right-try rules
are unchanged.

Per-corner cone points (distance along the road in metres / lateral in metres,
positive lateral is the right of the road):

- The Cutting, Casual: cone 1 at 1597.0 / -6.00, cone 2 at 1727.9 / +5.52,
  cone 3 at 1785.1 / -5.00; red board 1622.0; start gate 1513.0, turn-in
  1693.0, finish 1845.1.
- The Cutting, Pro: cone 1 at 1594.0 / -6.00 (cones 2 and 3 as above); red
  board 1619.0.
- Beaver Hairpin, Casual and Pro: cone 1 at 1760.2 / +5.50, cone 2 at
  1858.7 / -6.00, cone 3 at 1940.2 / +5.50; red board 1785.2; start gate
  1498.2, turn-in 1809.0, finish 2000.2.

The instructor's result (same each time and at 30, 60 and 144 FPS; all three
cones counted; never above 1.0 tyre slip, so no screech):

- The Cutting Casual: 10.58 s, peak slip 0.90, lowest speed 42 mph.
- The Cutting Pro: 10.24 s, peak slip 0.93, lowest speed 44 mph.
- Beaver Hairpin Casual: 16.05 s, peak slip 0.95, lowest speed 46 mph.
- Beaver Hairpin Pro: 15.50 s, peak slip 0.999, lowest speed 48 mph.

Student tries (all pass at 30, 60 and 144 FPS). The right try drives the
instructor's own line and speed plan with the ordinary steering helper and
input limits, and passes all four rules on both corners and both paces (this is
the fix for Beaver Hairpin, which previously missed cone 2; the old scripted
right driver braked harder than the instructor and arrived too slow). Two
full-pace tries beat the instructor, a slow try resets the streak, and three
in a row pass.

Late try (60 FPS; brakes at the board, steers with up to full steering):
The Cutting Casual screeches 0.85 s, Pro 0.80 s; Beaver Hairpin Casual 1.12 s,
Pro 1.16 s (needs 0.5 s). It plays `drive.radio.corner.late.result` and
finishes 0.42 to 0.59 s *faster* than the instructor, with no wall.

**Reviewed assertion change (Claude, design lead, 16 October answer to
`docs/board/questions/DRIVE-LESSON-1.md`).** The late-try acceptance no longer
requires losing 0.25 s or ending at a wall. It requires at least 0.5 s of
screech and that the late try's radio line plays. Why: on these tyres a later
brake costs no time. Measured: braking at the board, or 35, 45 or 55 m after
cone 1, always finishes faster than the instructor (0.26 to 0.83 s) until it hits
the wall (Beaver Hairpin from 45 m, The Cutting from 55 m); an instructor
braking at full strength still lost by 0.26 to 0.64 s and made the full-pace
driver crash on Casual. Nothing is loosened beyond that clause; the red board
stays 25 m after cone 1.

Other test changes. Removed the three trace-based `placeCones` tests
(widest-point-within-120 m, less-than-2 m movement, relative placement with
edge limits): they tested behaviour this change removes. Their replacements
test cone points for both directions, the 2 m check, the board limits and the
line itself. The `instructorControls` tests only gained a `curvatureAt` on the
fake line and one new case (light brake before the corner's braking point). The
native student helper now builds its plan with `lessonPlanFor`; the late driver
follows the instructor's plan up to cone 1 (needed to survive Beaver Kink).

Checks run here (Linux cloud): `tools/test-drive-lessons.mjs` 36 of 36 pass;
lane tier `--changed --jobs 8`: every suite passes except
`tools/test-earned-cars-ui.mjs` and `tools/test-course-kit.mjs`, which fail only
on "test cleanup requires the Recycle Bin" (Windows-only, unrelated; the laptop
should run them). `npm run build` passes. FIX-LAUNCH had not landed on
`integration/wasteland` when this was written: merge it, rerun this suite and
report any number that moved (instructor times, cone points and the late-try
screech depend on how the car accelerates). The "native" instructor and student cases ran here
(about 15 s). No browser or frame check was run.

Removed: the instructor's use of the planned racing line and `buildSpeedProfile`,
the trace-based `placeCones` (widest-point search) and the old exit-search
observation window in `buildInstructorRun`, and the three tests above.
