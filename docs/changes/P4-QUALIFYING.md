# P4-QUALIFYING

Status: merged into integration from 490c022d. Corrected lane 401/401 passed,
zero failed or unrun, 1,140.02 s with jobs 4; build 570 ms (335 modules).
Native/source/save reviews clear. No release.

## Behavior and settled design

Claude's 11 October moving start is 80 km/h at the authored pit exit, or
6 m before the line on the actual racing line. The first legal crossing arms
two solo flying laps; approach travel is not practice. Normal controls,
physics, gates and clocks supply both laps. Qualifying pays zero and records
no GP ghost. Each timed lap counts as practice; only the best clean telemetry
lap is saved per player/event/route/geometry in the bounded companion store.
Assisted laps cannot improve the grid. Seeded existing CPU profiles supply
times; exact ties favour CPU, and two invalid laps preserve the default grid.
The same circuit/field seed restarts with fresh state and five start lights.
The earned order retains the initialized grid origin and all previous poses.
Closed circuits alone offer qualifying. The session-only choice defaults SKIP.

## Checks and reviews

- Source starts from accepted integration 2595735e: Harbour/Snow on, Career dev,
  accepted catalogue order, pay, records, ghosts and release fixtures preserved.
  Nine feature files and the approved DOM fixture hook differ; all 21 incoming
  non-owned files, including README, are byte-identical to 259. No provisional GP tuning or Summit source.
- d2cd309b focused Qualifying passes: native 51.553/50.372 s, earned pole,
  6,131 steps, zero pay, two practice laps, quota/prior bytes and closed-grid
  assertions intact. Race settings 42 and lap telemetry 19 checks pass.
  Telemetry fingerprint 06e9dba5bf807c38e49465a3bd2a9d3212146ba7e6656e389772e5a436bcc565 stays exact.
- Retained private 22510 native packet: same laps; authored pit exit 490 m at
  80 km/h, actual 32.225/32.225 s in 5,328 steps; fresh 8-car/3-lap GP recorder,
  default Medium skip slot 5, prior layout bytes exact, five pictures, zero
  warnings/errors. Reuse it for unchanged production geometry/session.
- Root source review clear; prior Save Guardian approval stands for the exact
  retained telemetry source. Root verified the clean candidate and exact merged runtime/test blobs.

First lane on a9575dd4: 126 passed, 1 failed, 274 not run in 534.51 s; no build.
The existing native audio suite lost first-row meter continuity and its sixth
blast cue was 0.667 ms outside the unchanged overlap window. All six cues exist;
the exercised arena/audio path is byte-identical to its last accepted source.
The unchanged retry ended unexpectedly with exit -1 before audio and no final
totals. Its last output marked arena-shove, arena-wreck-rate and arsenal-runtime
failed; all three passed on the same source in the first lane. Detailed failure
output was not retained, so their cause and the termination cause remain unknown.
Root's logged unchanged lane exited normally: 400 passed, 1 failed, 0 unrun in
1,930.95 s; no build. Native Qualifying passed in 15.91 s, Career in 29.46 s,
audio 23/23 in 24.23 s, and all three interrupted arena suites passed. Only
course-eligibility failed: its absent qualifying control was represented by a
text-only stub, causing a TypeError. The approved fixture correction below
changes no runtime code or assertions. Corrected 490c022d passed all 401 suites
in 1,140.02 s and build 570 ms. Eligibility passed in 64.30 s, native audio
23/23 in 23.73 s, native Qualifying in 5.59 s and pay in 10.73 s.
QA-AUDIO-CRASH-RELIABILITY holds the unchanged intermittent-capture follow-up.

## Changed assertions and fixture reasons

Preserve initialized grid offset for all 8 poses/prevS; test real closed:false
session/menu exclusion. Recorder fixtures explicitly enable Career dev after
accepted pay wiring; timings, zero pay and every prior-byte check stay exact.
The course-eligibility DOM fixture now returns null for its absent
#qualifying-choice group; every other selector keeps its original text stub.
Every vehicle, course, ownership, restart, objective, wallet and menu assertion
is unchanged. Existing Qualifying tests cover the real group. An absent race
settings filename was corrected to the existing suite without a source change
or Qualifying repeat. No thresholds were weakened.

## Removed

The provisional full-lap approach is replaced by the approved moving start.
Repeated sync/history paragraphs are folded here; all current verdicts remain.
No race lifecycle, save format, live file or retained lane is removed.
