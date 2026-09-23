# Wasteland run log

Read the latest entry before resuming. Add one entry when a card starts,
reaches review, merges, is parked, or is released. Keep the board status
in sync with this log.

## 2026-09-22 PDT — Browser harness and feature switches merged

- FND-08 was cherry-picked as `c8b8ed6`. The integration smoke reached an
  active race in High and Performance, saved four screenshots and found zero
  console errors. The lane's deliberate console error caused the expected
  failure.
- FND-09 was cherry-picked as `f12d7e7`. Its 21 unit checks and private
  Experimental menu scenario passed with memory-only saves and zero browser
  errors. No Wasteland feature is in the switch catalog yet.
- A 1280×800 menu screenshot shows the large title crowding the player row.
  Track this as a UI polish card after the runner gate.

## 2026-09-22 PDT — FND-07 replay fingerprints merged

- Reviewed and cherry-picked replay lane commit `288645a` as integration
  commit `0881f73`. The integration run passed 162 checks for 18 replay cases
  across all 16 events, three frame rates and three repeat runs.
- A disposable physics constant change failed the lane check as expected.
  The traces pin the first 10 seconds; longer outcomes remain in the existing
  campaign and event suites.

## 2026-09-22 PDT — FND-03 old worktree retired

- The old worktree's 22 changed paths were preserved as `4237c2e` on its
  existing branch. Against `7564c7d`, 20 matched and the two differences
  are recorded in `docs/changes/FND-03.md`.
- `git worktree remove` succeeded without force. `git worktree list` no longer
  shows `.codex/worktrees/4555`, and the archival branch remains available.

## 2026-09-22 PDT — Integration opened and foundation cards merged

- `integration/wasteland` opened at d86cf4e from the green isolated foundation.
  FND-04 and FIX-01..03 are included in that base; FND-05 installed the board,
  change notes and role profiles.
- FND-02 moved through cold read, correction, commit and cherry-pick to
  integration as 4ebc906. This served as the first lane-to-integrator dry run.
- FND-01 was cherry-picked as 96f8852. Its private build passed, as did 194
  update-notice checks. Desktop and save-continuity acceptance await release.
- FND-06, FND-07 and FND-08 started in separate lane worktrees. No live release
  or GitHub push has occurred.

## 2026-09-22 PDT — First full suite green

- `node tools/run-tests.mjs` passed 138/138 suites in 836.34 seconds on the
  isolated `codex/wasteland-foundation` branch.
- FIX-01, FIX-02 and FIX-03 are committed as 215c7e5, 08d467c and a116397.
  FND-04 is committed as b746171. All four await integration and release.
- FND-05 setup is in progress. No live game release has occurred.

## 2026-09-22 PDT — Wave 0 board seeded

- FND-04 is committed at b746171 on codex/wasteland-foundation. It has not
  merged into integration or master.
- FIX-01, FIX-02, and FIX-03 passed focused checks; they were committed after
  the full suite finished.
- FND-01 and FND-02 have uncommitted edits. Their live and cold-read checks
  still need to be completed.
- The full suite was running. The integration branch had not been created.
- No release has been recorded from this board.

## Handoff

Review and merge FND-06..08 one card at a time after their gates. Complete
FND-01 desktop and save acceptance during the first release. Keep the live
checkout untouched until the final integration commit passes the full gate.
