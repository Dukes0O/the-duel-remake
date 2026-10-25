# GP-WIDE-START

Design settled before code, 25 October 2026: follow Claude's 24 October design
and Kyle's 25 October verdict. Base is ab7f423b: GP-PASSING-2 steps A and B
remain on under `cpu-racecraft`; all four added pass types remain off.

Step 1 restores 3b175051's formation alone: hold the absolute grid lane until
the racer's first braking point, then give an overlapping inside car priority
unless the outside car is more than half its own length ahead. No changes to
pace, grid, contact, nitro, pass types or gate numbers. Initial bias stays zero
as in the base; formation sets the lane bias before the first driving movement.

Only if step 1 fails, step 2 holds the grid lane for 200 m, then moves toward
the racing line when the swept lane has a car's width and one second clear
ahead and behind, with the same first-corner priority. If both fail, remove
the formation code and park the start with both tables.

Checks: one `racecraft-rate.mjs --races 20 --jobs 4 --check` batch per attempted
step (normal, slow and nitro; on/off; three courses; 360 races). Per-course
gates: 8+-crash races no greater than off; mean crashes at most off x 1.1;
early pile-ups at most off + 1; every paired normal-race CPU time within 2%;
all racers finish. Start measures are report-only. Preserve existing off-state
and RNG hashes and replay fingerprints. At the end run the requested lane
tier, production build and `grand-prix-existing` browser scenario once; obtain
one independent review. No new sound or art.

## Step 1: formation to the first braking point (failed)

One complete 360-race batch, exit 1. All players and all seven CPUs finished.
Each gate compares normal enabled races against the paired off-switch races.

| Gate (today off -> step 1) | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| 8+-crash races, on <= off | 12 -> 14 FAIL | 0 -> 4 FAIL | 0 -> 0 PASS |
| Mean crashes, on <= off x 1.1 | 9.10 -> 11.50 FAIL | 2.40 -> 3.85 FAIL | 0.30 -> 0.25 PASS |
| Early pile-ups, on <= off + 1 | 4 -> 6 FAIL | 0 -> 1 PASS | 0 -> 0 PASS |
| Max paired CPU-time change, <= 2% | 12.96% FAIL | 2.45% FAIL | 2.36% FAIL |
| Races with >= 2 distinct side-by-side pairs (report-only) | 0 -> 0 /20 | 0 -> 4 /20 | 0 -> 2 /20 |
| Races with leading-six lateral spread >= 3 m (report-only) | 0 -> 11 /20 | 0 -> 0 /20 | 0 -> 3 /20 |
| Mean distinct pairs at first braking (report-only) | 0.15 -> 0.05 | 0.20 -> 0.70 | 0.10 -> 0.55 |
| Mean leading-six lateral spread, m (report-only) | 2.409 -> 2.847 | 1.245 -> 2.592 | 1.763 -> 2.436 |
| CPU passes per normal race (report-only) | 7.75 -> 4.35 | 8.65 -> 12.15 | 3.50 -> 4.70 |
| Slower player passed (report-only, enabled) | 13 /20 | 20 /20 | 17 /20 |
| Nitro player leads after lap 1 (report-only, off -> on) | 0 -> 0 /20 | 0 -> 0 /20 | 16 -> 0 /20 |

Step 1 fails, so proceed to step 2 alone on the same GP-PASSING-2 base.
Step 2's clear-merge check covers the entire lateral corridor to the current
racing line, expanded by both cars' half widths, and a one-second longitudinal
gap plus both half lengths ahead and behind. It checks every active actor,
including the player, rather than relying on the driver's shorter rear sensor.
Once clear, the existing steering rate merges the car; until then it holds its
grid lane. The clearance check repeats until the car reaches the racing line;
if the gap closes mid-merge, the car holds its current lateral position until
it clears. First-corner inside priority still applies if merging is delayed.

Independent review caught a sticky merge-complete marker in the first step-2
draft. Its incomplete batch was stopped after 12 reported cases (no completed
report or verdict); verified case children drained. Fixed within the bounded
source attempt before the one complete acceptance batch: release the start
controller only on reaching the line, with focused cases for pause and resume.
No gate changed. Step 1's new release tests were replaced by step 2's 200 m
release tests because step 1 was removed; all pre-card assertions remain intact.

## Step 2: hold for 200 m, then merge when clear (kept by Claude)

One complete corrected 360-race batch, exit 1. All players and all seven CPUs
finished. No tuning or second complete batch followed this result.

| Gate (today off -> step 2) | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| 8+-crash races, on <= off | 12 -> 10 PASS | 0 -> 1 FAIL | 0 -> 0 PASS |
| Mean crashes, on <= off x 1.1 | 9.10 -> 6.55 PASS | 2.40 -> 2.50 PASS | 0.30 -> 0.10 PASS |
| Early pile-ups, on <= off + 1 | 4 -> 0 PASS | 0 -> 0 PASS | 0 -> 0 PASS |
| Max paired CPU-time change, <= 2% | 1.64% PASS | 1.64% PASS | 3.14% FAIL |
| Races with >= 2 distinct side-by-side pairs (report-only) | 0 -> 0 /20 | 0 -> 4 /20 | 0 -> 2 /20 |
| Races with leading-six lateral spread >= 3 m (report-only) | 0 -> 15 /20 | 0 -> 0 /20 | 0 -> 0 /20 |
| Mean distinct pairs at first braking (report-only) | 0.15 -> 0.25 | 0.20 -> 0.70 | 0.10 -> 0.35 |
| Mean leading-six lateral spread, m (report-only) | 2.409 -> 3.118 | 1.245 -> 2.592 | 1.763 -> 2.561 |
| CPU passes per normal race (report-only) | 7.75 -> 3.80 | 8.65 -> 10.50 | 3.50 -> 7.20 |
| Slower player passed (report-only, enabled) | 11 /20 | 20 /20 | 19 /20 |
| Nitro player leads after lap 1 (report-only, off -> on) | 0 -> 0 /20 | 0 -> 0 /20 | 16 -> 0 /20 |

## Claude's decision (25 October 2026)

Step 2 is kept under `cpu-racecraft` (dev), following Claude's decision on the
card. Claude accepts Woods' one extra 8+-crash race and Pacific's 3.14% time
change for the wider start and lower crashes overall. Gate numbers and the
table's FAIL labels stay unchanged. Step 1 is removed.

The first commit, c3bb4fe0, recorded the parked result but contained no trial
source. Restored the exact corrected step-2 patches retained in this session,
including the continuous-clearance fix and its focused tests. No tuning,
passing, nitro, grid, contact or RNG changes; no repeated 360-race batch.

Independent restoration review: clear. Restored Git blob IDs match the final
corrected batch source reviewed earlier: `race-field-driver.js` `2f21115b`,
`race-field.js` `fed5c97b`, and `test-race-field.mjs` `8a57386f` (1,349 checks).
All pre-card assertions and the batch tool are unchanged.

All 180 off-switch result rows are byte-identical between the two complete
batches. SHA-256 of their sorted JSON array:
`d539d34efa3d8fd6ea145df276241fa8ecb0d44610a2cf158f0ec2f30157ad00`.
Focused field checks passed on step 1 (1,336), first step-2 draft (1,343),
and corrected step 2 (1,349), including all three original full field/RNG
state hashes. These are the original batch and focused-check results.

## Original parked-build checks and review (c3bb4fe0)

- Independent code/numbers review: clear after fixing the step-2 merge-marker
  fault. Both full tables, derived start means, off-row fingerprint and final
  removal verified against the raw reports. No findings remain.
- Requested `node tools/run-tests.mjs --tier lane --changed --jobs 4`:
  6 passed, 1 sandbox failure, 6 not run. The failure was `test-full-check`
  launching `pwsh` for its temporary Git-copy fixture (`EACCES`), not game code.
  Ran only that suite and the six unstarted suites with native-process
  permission: 7 passed, 0 failed, 0 not run. Thus all 13 selected suites pass,
  with no repeated passing suite in the recovery. Replay fingerprints:
  225 checks across 25 cases; combat replay pins: 12 checks; world signatures:
  47 checks across twenty events, all unchanged.
- A preceding incomplete lane launch was stopped to restore the two-job cap;
  it supplies no gate verdict. The final completed coverage above is the gate.
- Production build: `npm.cmd run build` passed (531 modules, Vite 3.01 s).
  Plain `npm run build` was blocked before launching by the shell's `npm.ps1`
  execution policy. Existing chunk-size/dynamic-import warnings remain.
- Notes/board check: `node tools/test-board.mjs`, 192 checks passed.
- Session status refreshed with `node tools/build-status.mjs`; Cockpit sync
  ran through the protected runner, zero task changes. Board stays untouched.
- Requested `node tools/run-browser-scenarios.mjs --scenarios grand-prix-existing
  --jobs 1`: passed, 1/1 scenario, nine courses in High and Performance,
  36 screenshots, zero warnings/errors, memory-only saves and a private port.

## Restored step 2 checks and review

- Independent restoration review: clear; source/test blob IDs match the
  corrected batch exactly. No gate or pre-card assertion changes.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 54 passed,
  zero failures, zero not run, 261.55 s. Native-process permission enabled
  from the start; no interrupted run or suite rerun. Field suite: 1,349
  checks, including unchanged full-state/RNG pins. Replay fingerprints:
  225 checks; world signatures: 47 checks, unchanged.
- `npm.cmd run build`: passed, 531 modules, Vite 834 ms. Existing chunk-size
  and dynamic-import warnings remain. Used npm.cmd for this shell's script policy.
- `node tools/test-board.mjs`: 192 checks passed.
- `node tools/run-browser-scenarios.mjs --scenarios grand-prix-existing --jobs 1`:
  passed, 1/1 scenario, nine courses in High and Performance, 36 screenshots,
  zero warnings/errors, memory-only saves and a private port.
- Session status refreshed; protected Cockpit sync completed, zero task changes.
- No repeated racecraft batch. Existing step-2 table remains the accepted evidence.

## Removed

Removed the step 1 formation. Step 2 and its formation state/tests are kept;
the faulty draft merge-complete marker is replaced by continuous checks until
the car reaches the racing line. Temporary reports and generated verification
output are recycled after review; the tables and verdict stay here.
