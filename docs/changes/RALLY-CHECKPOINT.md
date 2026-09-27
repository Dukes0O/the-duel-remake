---
task: RALLY-CHECKPOINT
status: merged
kind: fix
flag: none
player_facing: yes
---

# Rally car snapped onto the road by checkpoints (26 September 2026)

Kyle and Gratian: with the rally car on Pacific Canyon, near the shortcut,
the game keeps resetting the car and dropping it onto the track.

## Cause

The rally car and the Titan are exempt from the course boundary, so they may
drive out on the dirt. Lap checkpoints still only counted on the road, a
shortcut or the shoulder. Crossing the checkpoints at s 2772 or 3000 off the
road (for example, leaving the shortcut wide or driving the desert beside it)
counted as a miss and snapped the car back onto the road just before the
checkpoint. Separately, boulders taller than the rally car can climb (1.15 m)
stop it with the message CLIMB LIMIT / ROLLING BACK, which is misleading.

A first probe that started past a checkpoint wrongly suggested a 1.8 km reset;
the clean reproduction from before the first checkpoint showed the snap.

## Changes

- `src/sim-laps.js`: `OFFROAD_CHECKPOINT_CORRIDOR` (120 m). For
  off-road-capable cars a checkpoint also counts within that distance of the
  road or an active shortcut. Ordinary cars are unchanged.
- `src/sim-crash.js`: an oversized-rock stop says ROCK TOO BIG / BACKING OFF.

## Tests

- New `tools/test-rally-checkpoint.mjs` (5 tests, committed red first): rally
  crossings at -25, -60, -90 and +40 m count and stay put; 150 m out is still a
  miss; the Titan shares the corridor; the Falcone still resets at -25 m; the
  rock message.
- Drive-through probe (rally car, Pacific Canyon, Mad Max): the desert line at
  -90 m and a wide shortcut exit at -25 m now pass all three checkpoints with
  no snap; before, both snapped back at 2772 (and 3000).
- Lane tier: 134 passed, 0 failed, 0 not run (replay fingerprints unchanged).
  Build passed.

## Changed assertions

None.

## Removed

Nothing.
