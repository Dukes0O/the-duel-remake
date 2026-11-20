# QA-NIGHT-20-NOV

The night check of 20 November 2026 on `d23e32eee`, a full night (shared files changed). Claude's card.

## What happened

- **Full tier:** 706 of 710 passed. **Combat balance:** passed.
- **Frames (Performance, the gate), about 04:30 with both screens on:** p95 18.4 ms, a pass. High p95 34.9 ms. First
  race load 5,207 ms (a warning).
- **Browser:** 235 of 247 passed.

## Sorted (Claude, 20 November, morning, on `b29c41cce`)

- **Cured, a deliberate change that moved two pins:** `test-tyre-slip` (driving fingerprint on Pacific Canyon) and
  `test-race-field` (racecraft-off state, seeds 1989 and 42; seed 17 did not move). Both moved at
  QA-ROUND-SOLID-HEADING (`4f8387d1f`, 19 November) and at no later merge. In each run the first step that differs is
  the player's car, off the road at 68 mph, meeting a round rock: on the tyre-slip run the exact body now meets
  rock-155 where the old sweep let the nose through; on the race-field run the old, wider sweep stopped the car on
  rock-23 and the exact body clears it. Re-recorded; nothing is loosened. This also closes QA-RACE-FIELD.
- **Cured, a helper the copies missed:** `test-audio-crash-peak` and `test-first-person-polish` copy tool scripts into
  a scratch folder, and since `4858fc5e6` (19 November) those scripts import `tools/evidence-date.mjs`, which was not
  copied. Both copies now take it.
- **Cured, a check older than a later card:** `town-outposts` counted only the outposts' solids on the drive's town
  grid; since TOWN-VANE-SCENE Mrs Vane's 13 solids share that grid (`src/arena/modes/world-job.js`). It now counts both.
- **Passed on one rerun alone (rule 3):** `everburn-job1`, `lab-navigation`, `release-controls`, `rescue-view`,
  `story-kogane`, `summit-finish-area`, `p4-audio`. Two of them timed out taking a picture and one waited too long for the track,
  so the night's load is the likely cause.
- **Known cards:** `machine-borer` (QA-NIGHT-18-NOV); `audio-baseline` fails alone too, with the same repeat peak its
  card QA-AUDIO-BASELINE-CONTROL records, so it joins the standing list under that card.
- **Standing list:** `frames`, `deep-frames`, `frame-pacing`, and now `audio-baseline`.

## What to do

1. Fold a one-off miss into its own card only if it fails again on a night.
