---
task: CAMERA-CYCLE
status: ready-to-merge
kind: controls
player_facing: yes
---

# One camera key, and arrows on foot (Kyle, 1 October 2026)

## What changed

- Kyle: every camera view had its own key (D chase, C front, B back, V right,
  X left), and hood and wide had no key at all. Now C steps through all seven
  views in order (chase, hood, wide, front, back, right, left) and wraps back
  to chase. D, B, V and X no longer change the camera. The gamepad camera
  button already cycled and is unchanged. On foot, C still switches between
  first person and overhead.
- The main-menu controls strip reads "C CHANGE CAMERA", and the pause help
  reads "C TO CHANGE CAMERA".
- On foot, the arrow keys move the fighter (up forward, down back, left and
  right sidestep), as they drive the car. W, A, S and D still work, for
  players who aim with the mouse in their right hand. Looking and aiming are
  unchanged (mouse or gamepad).

## Tests

- test-camera-views: C steps through all seven views and wraps; held C
  repeats are ignored; D, B, V and X leave the camera alone.
- test-input-contexts: each arrow moves the fighter on foot (new checks).
- test-input-contexts and test-onfoot-camera-choice: the car's C is now the
  cycle action (changed assertions: they named the old C = front and D =
  chase keys, which Kyle replaced).
- test-keyboard-steering: D through the real key handler now leaves the
  camera on its current view (changed assertion: it expected D to reset to
  chase); D still does not steer.
- test-onfoot-hints: keyboard X in the car now maps to nothing (changed
  assertion: it named X = left camera); X still never exits the car.
- onfoot-hints browser scenario: the in-car key check presses C and expects
  the next view (hood) instead of X selecting left.
- Lane tier and build pass. No race state changes, so no replay changes.

## Removed

- The per-view camera keys (CAMERA_KEYS) and their menu text.
