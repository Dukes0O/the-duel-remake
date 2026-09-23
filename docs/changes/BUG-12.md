---
task: BUG-12
status: merged
kind: gameplay-fix
flag: none
player_facing: yes
---

## What changed

Bomb blasts now skip traffic cars marked `alive: false`. Those cars remain in
the traffic array after removal, but should no longer take an invisible hit.
Live traffic at the same position still takes blast damage.

## Tests and evidence

- Added two assertions to `tools/test-combat.mjs`. Before the source fix, the
  removed-car assertion failed because its speed and damage changed. After the
  fix, both the removed-car and live-car assertions pass.
- `node tools/test-combat.mjs`: 29 checks passed.
- `node tools/test-road-powerups.mjs`: passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 77 jobs passed,
  none failed or skipped, in 254.52 seconds. This includes the 162 replay
  fingerprint checks across 18 cases, three frame rates and three runs.
- `npm run build`: passed. Vite reported the existing large rendering chunk
  warning.
- Integration commit `558b378` passed 143 merge suites in 260.38 seconds,
  production build and private High/Performance browser smoke with four
  screenshots and zero warnings/errors.

## Assertions and race behavior

No existing assertion changed. The two new assertions check that a blast does
not change a removed traffic car or emit a hit event, and that the same blast
still damages a live traffic car. No replay fingerprint changed. The intended
race change is limited to bomb blasts near removed traffic.

## Review

The Director independently reviewed the removed/live traffic assertions and
the narrow blast-loop guard before integration. No additional changes were
requested.
