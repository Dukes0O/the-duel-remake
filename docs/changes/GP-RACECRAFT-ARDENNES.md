# GP-RACECRAFT-ARDENNES

## Decision and reproduction

25 October 2026, lane `codex/racecraft-ardennes`, base `90c47a40`.
The reported failure predates the merged GP-WIDE-START step 2. With that
formation in place and `cpu-racecraft` locally set to `on`, the unchanged
`tools/test-circuit-ardennes.mjs` passes, including the original stock
959/.95/Medium/1989/1000 full-field replay. A separate trace of that exact
fixture also finishes with zero player major crashes. All seven CPUs finish.

Before changing game code, the decision is to retain the already merged
wide-start fix and verify it. No extra simulation adjustment is justified by
a fixture that already passes. No test, setup, assertion or tolerance changes.
The switch returns to `dev` before committing.

For diagnosis only, a temporary Node loader substituted the pre-wide-start
driver from `ab7f423b`, leaving the current working source untouched. That
reproduces one major player crash. At 288.15 s on lap 2, Whitewood (player
station 12437.36 m, course phase 5753.43 m), Boone Ward, CPU index 5,
`banshee_muscle`, converges left into the player as the player draws alongside.
Just before contact (288.10 s), the player is at lateral 1.57 m / 191.14 mph;
Boone is 2.94 m ahead at lateral 5.10 m / 171.96 mph, heading left at
-0.127 rad. Neither is boosting at contact; Boone had used defensive CPU
nitro earlier, about 287.00–287.73 s. His pass state is null. This is lap 2,
so neither the lap-1 nitro lock nor the lap-1 defence extension is active.
The contact knocks both cars into a spin; the player's major-crash counter
increments at 289.33 s, station 12524.79 m, lateral -17.81 m. The test's
historical Long Left name does not locate this collision: it is at Whitewood.

With the current wide-start driver, the traced player finishes at 337.296 s
without a major crash. The formation changes the field's earlier trajectory
and prevents this encounter in the required replay; this does not establish
that every possible later-lap converging contact has been eliminated.

## Requested tables and checks

The same `racecraft-rate.mjs --races 20 --jobs 4 --check` batch supplies both
requested tables: all three courses, normal/slow/nitro, paired switch off/on,
360 races, with wide-start step 2 present. One complete batch, exit 1:
the original strict gates still flag Woods' one extra 8+-crash race and
Pacific's 3.1432% maximum paired time change. These are exactly the accepted
GP-WIDE-START step-2 results, with no worsening. Every player and all seven
CPUs finish in every race (360/360); no unfinished races.

### GP-PASSING-2 three-course gates, with wide start in place

All arrows are this batch's switch off -> on. Normal races supply crash and
time gates; the nitro benchmark supplies the lap-1 leader count.

| Gate | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| Nitro player leads after lap 1, at most 5/20 | 0 -> 0 PASS | 0 -> 0 PASS | 16 -> 0 PASS |
| 8+-crash races, on <= off | 12 -> 10 PASS | 0 -> 1 FAIL (accepted) | 0 -> 0 PASS |
| Mean crashes, on <= off x 1.1 | 9.10 -> 6.55 PASS | 2.40 -> 2.50 PASS | 0.30 -> 0.10 PASS |
| Early pile-ups, on <= off + 1 | 4 -> 0 PASS | 0 -> 0 PASS | 0 -> 0 PASS |
| Max paired CPU-time change, <= 2% | 1.64% PASS | 1.64% PASS | 3.14% FAIL (accepted) |

### GP-WIDE-START step 2 table

| Gate / measure (off -> on) | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| 8+-crash races, on <= off | 12 -> 10 PASS | 0 -> 1 FAIL (accepted) | 0 -> 0 PASS |
| Mean crashes, on <= off x 1.1 | 9.10 -> 6.55 PASS | 2.40 -> 2.50 PASS | 0.30 -> 0.10 PASS |
| Early pile-ups, on <= off + 1 | 4 -> 0 PASS | 0 -> 0 PASS | 0 -> 0 PASS |
| Max paired CPU-time change, <= 2% | 1.64% PASS | 1.64% PASS | 3.14% FAIL (accepted) |
| Races with >= 2 distinct side-by-side pairs (report-only) | 0 -> 0 /20 | 0 -> 4 /20 | 0 -> 2 /20 |
| Races with leading-six lateral spread >= 3 m (report-only) | 0 -> 15 /20 | 0 -> 0 /20 | 0 -> 0 /20 |
| Mean distinct pairs at first braking (report-only) | 0.15 -> 0.25 | 0.20 -> 0.70 | 0.10 -> 0.35 |
| Mean leading-six lateral spread, m (report-only) | 2.409 -> 3.118 | 1.245 -> 2.592 | 1.763 -> 2.561 |
| CPU passes per normal race (report-only) | 7.75 -> 3.80 | 8.65 -> 10.50 | 3.50 -> 7.20 |
| Slower player passed (report-only, enabled) | 11 /20 | 20 /20 | 19 /20 |
| Nitro player leads after lap 1 (report-only) | 0 -> 0 /20 | 0 -> 0 /20 | 16 -> 0 /20 |

The two tables share one batch, rather than repeating the same
measurement. Crash counts, times, passing and formation measures reproduce
the accepted step-2 table. No new exception is needed.

## Checks and review

The requested switch-on field-suite invocation stops at its existing
`racecraft is preview-only` assertion (`FEATURE_STATES['cpu-racecraft'] ===
'dev'`). This is a release-state check, not a simulation failure. It is kept
unchanged. The suite also passes with the committed `dev` state; its
racecraft behavior cases explicitly enable the switch.

Completed checks on the unchanged runtime source at `90c47a40`:

- Locally `on`: `node tools/test-circuit-ardennes.mjs`, 46/46 passed,
  including the unchanged original Long Left fixture (37.63 s).
- Committed `dev`: `node tools/test-race-field.mjs`, 1,349 checks passed.
  All three original field-state/RNG hashes remain exact.
- Committed `dev`: `node tools/run-tests.mjs --tier lane --changed --jobs 4`,
  11 suites passed, zero failed, zero not run (356.00 s). This is a
  documentation-only lane. Included 225 replay checks and 47 world checks;
  fingerprints and signatures unchanged.
- `npm.cmd run build`, passed, Vite 2.52 s. Used `npm.cmd` for PowerShell
  script policy; existing chunk-size and dynamic-import warnings remain.
- Locally `on`, frozen QA bundle: `node tools/run-browser-scenarios.mjs
  --scenarios grand-prix-existing --jobs 1`, passed, 36 screenshots,
  zero warnings/errors, private port 28521 and memory-only saves.
- Independent review: retaining the already merged formation is justified;
  no runtime or test change needed. Nitro interval corrected from the trace.
  Final review checked all 360 raw cases, both tables and the completed logs:
  clear, no remaining findings. The two accepted overages are unchanged.
- Session status refreshed. Protected Cockpit sync marked the completed
  GP-PASSING-2 task done and identified this card's missing link. Added
  SIM task T-042, linked `GP-RACECRAFT-ARDENNES` in its notes, and let
  `cockpit-sync.py` derive its In Progress status from the board. Local
  Cockpit display rebuild passed.

Runtime and test files, including the feature-flag file, remain byte-identical
to `90c47a40`. Integration advanced during this run; this evidence covers that
base and this lane's documentation-only outcome, not the later integration
source. No merge or push is performed.

## Removed

No runtime code or assets replaced. Temporary diagnostic loaders, traces,
batch reports, browser captures and build output are recycled after their
verdicts are recorded here.
