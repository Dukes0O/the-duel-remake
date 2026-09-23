---
task: PLAYTEST-BOUNDARY-CHECKPOINTS
status: ready-to-merge
kind: playtest-fix
flag: none
player_facing: yes
---

## What changed

The car's visual terrain bounce now fades with speed and stops when the car is
parked. Dirt still shakes the car when it moves. This fixes the constant bob
seen when a stopped car is off the road.

A missed circuit checkpoint now restarts the car a short drive before the
next required gate. An off-road finish gets the same short retry before the
line. Gate order and physical crossing checks still apply. An implausible
position jump retains the older, conservative recovery position.

## Verification

- `node tools/test-checkpoint-recovery.mjs`: passed. New cases cover a missed
  gate found at the finish, a nearby off-road finish retry, the legal recrossing,
  and a discontinuous jump that cannot earn the closer reset.
- `node tools/test-terrain-bounce.mjs`: passed at rest, low speed, road speed,
  reverse speed and zero roughness.
- `node tools/test-race-integrity.mjs`: 605 checks passed.
- `node src/test.js`: 518 passed, 0 failed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 90 suites passed,
  0 failed, including all replay fingerprints.
- `npm run build`: passed. Vite reports the existing large rendering chunk.

Two existing `src/test.js` assertions changed because they required the old
long checkpoint reset. They now require recovery before the unearned crossing,
close enough to retry. No checkpoint validation assertion was removed.
No replay fingerprint changed: the authored clean races never miss a gate.
