# WW-EVERBURN-JOBS

## Changed

- Replaced the synthetic `stepJob` driver with a fixed-step `Duel` driver that
  uses player controls and runs all six story jobs and three side jobs.
- Added render-car choices for the thief, Big Bess and Old Smoke's furnace.
- Kept shared combat numbers and job settings unchanged while checking the
  real Easy path.

## Checks

- `node tools/test-everburn-easy.mjs` — **not accepted**. An experimental
  version with instant mouse-look finished eight jobs 10/10, but it did not
  meet the child-pace requirement. The Everburn finale finished 0/10 and
  remained on its first defence wave. A separate Cinder hand-flamer diagnostic
  also finished 0/10 with no raider hits; the player stayed outside its
  six-metre range. The child-pace run has not produced a complete result.
- Lane tier and build — not run after this acceptance failure. Do not hand this
  card to integration until the Easy path is settled and the check passes.
- Browser and look checks — Claude runs after the Easy proof passes. Check that
  each mission's marker and prompt match its objective, the on-foot job clearly
  prompts exit and return, and the finale progresses from three defence waves
  to three glowing furnace vents.

## Changed assertions

- None. The check still requires at least 8 wins in 10 runs for every job.

## Race fingerprints

- Not applicable. These job definitions do not alter race simulation or replay
  fixtures.

## Removed

- Removed the synthetic job-engine-only driver and its false 10/10 acceptance
  report.

## Waiting on Claude

- Settle the finale's Easy path. Options and Codex's recommendation are in the
  card's open question. Keep the current job data and shared combat numbers
  until that decision is recorded.
