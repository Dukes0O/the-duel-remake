---
task: BUG-01
status: merged
kind: fix
flag: none
player_facing: yes
---

## What changed

The car reads only the left and right arrow keys for steering. A no longer
steers left or cancels a held right arrow. D still resets the chase camera.
W and S still control the pedals.

## Evidence

- Before the source change, `test-keyboard-steering.mjs` failed with A = -1
  instead of 0, and `test-road-powerups.mjs` failed at the same A assertion.
- After the source change, `test-keyboard-steering.mjs` passed 96 checks,
  including actual App key dispatch, camera reset, pedals, analog priority,
  releases, and identical 30/60/144 FPS trajectories.
- `test-road-powerups.mjs` passed. Its power-up behavior checks are intact.
- The integration commit `3221765` passed all 143 merge-gate suites, the
  production build, and private High/Performance browser smoke with four
  screenshots, zero warnings, and zero errors.

## Behavior and test changes

The existing assertions that treated A as left steering were changed to use
Left Arrow for the left/right shaping, opposing-key and analog-priority
checks. New assertions make A neutral, prove it cannot cancel Right Arrow,
and exercise D and the W/S pedals through the real App key handler. A prior
assertion compared two identical Right Arrow runs, so it now checks the
actual car receives positive steering from Right Arrow. No physics or
steering-ramp tuning changed. The expected trajectory hash stays
`cfe859d2a6aea7e9` after the test uses Left Arrow.
