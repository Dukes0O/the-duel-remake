# GP-RACECRAFT-ARDENNES

## Cause and decision

Claude's follow-up replaces the earlier documentation-only resolution at
`9876a9e8`: the wide-start trajectory avoided the reported collision, but
the underlying lateral convergence must be fixed.

The pre-wide-start driver (`ab7f423b`) reproduces one major player crash.
At 288.15 s on lap 2 at Whitewood, Boone Ward (CPU 5, Banshee) converges
left as the player draws alongside. Both spin; the major-crash counter
increments at 289.33 s. Neither car boosts at contact. Boone used defensive
nitro about 287.00 to 287.73 s; this is not the lap-1 defence extension or
nitro lock. The historical Long Left test name does not locate this contact.

## Fix, settled before the final checks

Marked GP-RACECRAFT-ARDENNES blocks in `src/race-field-driver.js` guard the
shared movement function, after every lateral controller. Defence, passing,
line return, wide-start merges and pit movement all use this last guard.

An active car within both half lengths plus the shorter half length owns its
side. Check the intended target and full steering heading, not just the
nominal target: racing-line heading could otherwise steer into a neighbour
even when that target points away. If a move reaches the alongside car's
corridor, hold the current lateral position and use the road's curvature
and current speed/progress to cancel racing-line drift. Steering away and
resuming after longitudinal clearance remain allowed.

The lateral reach is both half widths plus 0.3 m, expanded by the greatest
of the shorter half length, intended lateral travel, half a second of
intended-heading travel and half a second of relative lateral closing.
A distant gallery car cannot block the separate Summit branch; a target
that actually sweeps across that car still blocks.

A held lane cannot borrow the racing line's early turn-in. While holding
without a separate route planner, sample road curvature at 0/20/40/80/120 m.
Use the actual lane offset, tyre and yaw limits, a 0.8 speed factor (20%
steering reserve), and the car's actual braking distance to cap speed.
The first heading-only draft caused an early CPU pile-up in the unchanged
Ardennes fixture; this held-lane braking cap removes it. No gate changed.

Switch off bypasses the guard and speed cap; it keeps the original movement
calculations and seeded random stream. No race-field rules or contact solver
changes, no dependencies, save changes, art or sound events.

## Proof and checks

- Added a real field case: player alongside an already defending lap-2 CPU,
  both sides, 60 frames each. Check the CPU target and actual lateral gap.
  Also check release, steering away, separate Summit corridor and the
  nominal-away/steering-toward combination. All old assertions remain.
- Mutation check: a temporary loader disabling only the guard makes the new
  defending-player target assertion fail. No mutation or loader is committed.
- Exact original 959/.95/Medium/1989/1000 fixture, temporary loader substituting
  `ab7f423b` plus only the marked fix blocks: all seven CPUs finish, no pile-up,
  zero player major/stage crashes and boundary resets. Player time 324.987 s,
  one CPU crash in the first 30 s; full race 325.0 s. The wide start is absent.
- Current wide-start source, same fixture traced separately: all seven CPUs
  finish, zero early CPU crashes, no pile-up, zero player major/stage crashes
  and boundary resets. Player time 313.462 s; full race 316.3 s.
- Locally on: unchanged `node tools/test-circuit-ardennes.mjs`, 46/46 pass,
  94.86 s, including every original replay assertion.
- Final locally on field invocation passes the new cases, then stops at the
  unchanged preview-only release-state assertion. Restored the switch to dev.
- Switch dev: `node tools/run-tests.mjs --tier lane --changed --jobs 4`,
  32 suites pass, zero failures/unrun, 403.80 s. Full field suite: 1,596 checks
  pass, including all three original off-state/RNG hashes. Replay fingerprints:
  225 checks pass; world signatures: 47 checks pass, unchanged.
- Final locally on browser bundle: `node tools/run-browser-scenarios.mjs
  --scenarios grand-prix-existing --jobs 1`, 1/1 pass, 36 screenshots,
  zero warnings/errors, private port and memory-only saves.
- `npm.cmd run build` passes with switch dev, Vite 1.98 s. Existing chunk-size
  and dynamic-import warnings remain.
- Source review: clear after bounding the separate-road corridor and checking
  held-lane speed units, braking distance, deterministic lookup count and the
  unchanged switch-off path. Independent final review confirms both tables,
  the accepted Pacific exception and the recorded check results; no findings.
- Refreshed the required board status snapshot. End-of-session Cockpit sync
  passed, zero tasks changed. Lane handoff only; no merge or push.

The literal switch-on field suite still asserts that racecraft is preview-only
(`FEATURE_STATES['cpu-racecraft'] === 'dev'`). Keep that assertion unchanged;
record the literal invocation separately from the full suite at committed dev,
whose behavior cases explicitly enable racecraft.

## GP-PASSING-2 and GP-WIDE-START tables

One complete final batch: `node tools/racecraft-rate.mjs --races 20 --jobs 4
--check --output .qa-dist/combat-balance-racecraft.json`. Twenty seeds per
course, three courses, normal/slow/nitro, paired off/on, wide-start step 2
present: 360/360 cases complete, every player and all seven CPUs finish.

Exit 1 under the unchanged strict 2% gate: Pacific's maximum paired time
change is 3.1038%, below the accepted 3.1432%. This is the only strict flag.
Woods' accepted one extra 8+-crash race is eliminated. No new exception or
tolerance change is needed. Nitro lap-1 leaders remain 0/20 on every course.

### GP-PASSING-2 three-course gates, with wide start

Arrows are this batch's off -> on. Crash/time gates use normal races.

| Gate | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| Nitro player leads after lap 1, at most 5/20 | 0 -> 0 PASS | 0 -> 0 PASS | 16 -> 0 PASS |
| 8+-crash races, on <= off | 12 -> 5 PASS | 0 -> 0 PASS | 0 -> 0 PASS |
| Mean crashes, on <= off x 1.1 | 9.10 -> 5.60 PASS | 2.40 -> 2.00 PASS | 0.30 -> 0.15 PASS |
| Early pile-ups, on <= off + 1 | 4 -> 0 PASS | 0 -> 0 PASS | 0 -> 0 PASS |
| Max paired CPU-time change, <= 2% | 1.49% PASS | 1.74% PASS | 3.10% FAIL (accepted) |

### GP-WIDE-START step 2 table

| Gate / measure (off -> on) | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| 8+-crash races, on <= off | 12 -> 5 PASS | 0 -> 0 PASS | 0 -> 0 PASS |
| Mean crashes, on <= off x 1.1 | 9.10 -> 5.60 PASS | 2.40 -> 2.00 PASS | 0.30 -> 0.15 PASS |
| Early pile-ups, on <= off + 1 | 4 -> 0 PASS | 0 -> 0 PASS | 0 -> 0 PASS |
| Max paired CPU-time change, <= 2% | 1.49% PASS | 1.74% PASS | 3.10% FAIL (accepted) |
| Races with >= 2 distinct side-by-side pairs (report-only) | 0 -> 1 /20 | 0 -> 4 /20 | 0 -> 2 /20 |
| Races with leading-six lateral spread >= 3 m (report-only) | 0 -> 11 /20 | 0 -> 0 /20 | 0 -> 0 /20 |
| Mean distinct pairs at first braking (report-only) | 0.15 -> 0.30 | 0.20 -> 0.70 | 0.10 -> 0.40 |
| Mean leading-six lateral spread, m (report-only) | 2.409 -> 3.001 | 1.245 -> 2.592 | 1.763 -> 2.596 |
| CPU passes per normal race (report-only) | 7.75 -> 4.55 | 8.65 -> 11.10 | 3.50 -> 7.25 |
| Slower player passed (report-only, enabled) | 14 /20 | 20 /20 | 18 /20 |
| Nitro player leads after lap 1 (report-only) | 0 -> 0 /20 | 0 -> 0 /20 | 16 -> 0 /20 |

Both tables use the same complete batch. Other report-only normal-race data:
all-cause player crash totals, off -> on, are Panorama 5 -> 6, Woods 6 -> 10,
Pacific 0 -> 1. Manoeuvre causes were not collected for these player totals.
The specific historical replay has zero player major/stage crashes with the fix.

Two incomplete batch starts were stopped for shared-job admission before any
complete report. The standard inventory matches `combat-balance` but misses
`racecraft-rate`; the final output filename includes `combat-balance` so its
existing process counter sees this balance run. No test machinery changes.

## Removed

Replaced the earlier documentation-only conclusion with the behavior fix.
No old runtime code or assets are retained. Temporary diagnostic loaders,
probes, gate logs, batch reports, browser captures and build output are
recycled after review; only this verdict and its tables remain.
