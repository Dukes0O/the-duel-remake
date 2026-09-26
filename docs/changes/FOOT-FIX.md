---
task: FOOT-FIX
status: ready-to-merge
kind: bug
flag: wasteland2
player_facing: yes
---

# On-foot controls were mirrored; R no longer restarts (25 September 2026)

## What changed

Kyle, playing the live release: out of the car, the controls felt backwards.
Projected through the first-person camera, D walked the fighter to the left of
the screen, A to the right, and moving the mouse right turned the view left.
Forward, back and vertical look were correct. The camera faces
(sin yaw, cos yaw), so its right is (-cos yaw, sin yaw); movement used the
opposite vector and the mouse raised yaw instead of lowering it.

- `src/onfoot.js`: the look and move rules are now `applyFootLook` and
  `footMoveDirection` (same numbers, extracted), then fixed: strafing uses the
  camera's right and mouse right lowers yaw. The gamepad right stick shares
  the mouse path, so it is fixed too.
- `src/input-contexts.js`: Kyle asked for the R restart key to go (it was a
  request from Gratian, and on foot R sits beside W, A, S and D). R now does
  nothing in the car or on foot; the on-screen Restart button is unchanged.
  `README.md` says there is no restart key.

## Behavior and test changes

- `tools/test-onfoot-screen-directions.mjs` (new): projects D, A, mouse right
  and mouse up through the real camera at four facings. It failed 4 of 4 on the
  old code and passes now.
- `tools/test-onfoot.mjs`: the barrier and slope checks walk with A instead of
  D, because the barrier and slope sit on the side D used to reach.
- `tools/test-onfoot-controls-camera.mjs`: mouse right now lowers yaw.
- `tools/test-progression-integration.mjs`: R is checked to do nothing on every
  race screen; the restart settlement checks (bank kept, pending earnings
  discarded, setup kept, no double settlement) now use the Restart button path.

## Evidence

The on-foot fix alone passed the full tier, 272 of 272. The combined commit's
full tier is recorded with the release.
