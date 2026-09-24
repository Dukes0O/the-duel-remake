---
task: FIX-04
status: merged
kind: fix
flag: none
player_facing: no
---

# Restore a passing full test run on integration

## What changed

A full test run on integration commit `91187af` on 23 September 2026 failed
13 of 213 test files. Nothing in normal play was broken. The failures came from
four causes, each added by a change that was checked only on its own:

1. **Pointer lock without a page** (9 files). FOOT-03 (`e34f2cc`) listens for
   pointer-lock changes on `document` while the game starts. Headless tests
   that build the real `App` provide a `window` but no `document`, so starting
   the game threw an error. The listener now installs only when a page exists.
   Affected: progression-integration, route-variants-integration,
   app-lifecycle, render-readiness, race-settings, camera-views,
   keyboard-steering, phase-diagnostics, render-readiness-ui.
2. **New gamepad "interact" value** (2 files). FOOT-02/03 added the X button
   as `interact` in car gamepad input, as SPEC 3.12 describes. The
   input-contexts and gamepad-weapons tests still expected the older shape.
3. **Rook's health perk** (1 file). CREW-01 (`ce12e38`) made Rook's +10%
   on-foot health active, and Rook is the default crew member. The FOOT-02
   test still expected 100 health on exit and 75 after a bailout.
4. **A scripted race shifted** (1 file). The 5:23 pm balance change
   (`0cdf190`, also live on `master`) moves the real crossbow shove in the
   seeded Medium race from lap 1 to the third gate of lap 2. Recovery still
   puts the car 1 m before the missed gate. The test assumed lap 1. This file
   also fails on live `master`; the fix reaches `master` with the next release.

## Evidence

- Before: `node tools/run-tests.mjs --tier full --jobs 8 --keep-going` on an
  exported copy of `91187af`: 200 passed, 13 failed, 0 not run, 341.59 s.
- The checkpoint failure was traced by testing each commit: it passes on
  `b2d43be` and fails from `0cdf190` onward, on both `master` and integration.
- After: see the merge record in `docs/board/run-log.md` for the full tier,
  build and browser smoke on this change.

## Behavior and test changes

- `src/app.js`: one guard, `typeof document !== 'undefined'`, around the
  pointer-lock listener. No race state, save or fingerprint changes.
- `tools/test-input-contexts.mjs`, `tools/test-gamepad-weapons.mjs`: the exact
  expected input now includes `interact: false`. Added one check that the X
  button sets `interact: true`. No expectation was loosened.
- `tools/test-onfoot-transition.mjs`: Rook's exit health is now asserted as
  exactly 110 (100 × his 1.1 perk), and the bailout as exactly 85 (110 − 25).
  Added a new case: Nell, who has no health perk, exits with exactly 100.
- `tools/test-checkpoint-recovery.mjs`: the real-race check now finds the gate
  named at the reset and requires the retry within 2 m before that gate on the
  same lap. It no longer assumes the miss happens before 20 s on lap 1. The
  one-reset count, gate order and lap completion checks are unchanged.
