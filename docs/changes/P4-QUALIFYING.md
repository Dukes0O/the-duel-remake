# P4-QUALIFYING

Status: scoped final lane; focused checks and prior native/save reviews clear.
Final lane gate and build remain pending. No release.

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

- Source starts from accepted integration2595735e: Harbour/Snow on, Career dev,
  accepted catalogue order, pay, records, ghosts and release fixtures preserved.
  Exactly nine owned files differ; all21 incoming non-owned files, including
  README, are byte-identical to259. No provisional GP tuning or Summit source.
- d2cd309b focused Qualifying passes: native51.553/50.372 s, earned pole,
  6,131 steps, zero pay, two practice laps, quota/prior bytes and closed-grid
  assertions intact. Race settings42 and lap telemetry19 checks pass.
  Telemetry fingerprint06e9dba5bf807c38e49465a3bd2a9d3212146ba7e6656e389772e5a436bcc565 stays exact.
- Retained private22510 native packet: same laps; authored pit exit490 m at
  80 km/h, actual32.225/32.225 s in5,328 steps; fresh8-car/3-lap GP recorder,
  default Medium skip slot5, prior layout bytes exact, five pictures, zero
  warnings/errors. Reuse it for unchanged production geometry/session.
- Root source review clear; prior Save Guardian approval stands for the exact
  retained telemetry source. Final lane --changed --jobs4 and build are queued.

## Changed assertions and fixture reasons

Preserve initialized grid offset for all8 poses/prevS; test real closed:false
session/menu exclusion. Recorder fixtures explicitly enable Career dev after
accepted pay wiring; timings, zero pay and every prior-byte check stay exact.
An absent test-race-settings-ui filename was corrected to the existing suite;
no test source changed or Qualifying repeat ran. No thresholds were weakened.

## Removed

The provisional full-lap approach is replaced by the approved moving start.
Repeated sync/history paragraphs are folded here; all current verdicts remain.
No race lifecycle, save format, live file or retained lane is removed.
