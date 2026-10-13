# FIX-FOOT-MOUSE

Kyle uses a separate mouse and cannot fire while holding right-click or look before the first shot. The owned App mouse hook now uses per-button mouse events, so right aim and left fire remain independent. Mouse movement over the active game canvas works before the first click and if pointer lock is refused. Right-click requests capture without firing. Pause, blur, reentry, disposal and lock release retain button clearing; unrelated Summit hooks are untouched.

## Checks

The existing App lifecycle fixture reproduced the pre-shot look failure. Added event acceptance covers right-click capture, left/right chording, separate release of each button, pointer-lock refusal, paused input, blur and disposal. Original lifecycle assertions stay exact. Focused result, one nearby lane/build and independent review follow. Actual browser/night checks belong to installed FAC-03.

## Removed

Replaced the on-foot pointerdown/up handlers that dropped the second mouse button and the unconditional pointer-lock requirement for mouse look. No new setting, dependency, harness, ammo rule, reward, save field or asset.

Development: pre-shot look failure reproduced; after source fix all new button/look assertions passed up to blur. The new event fixture omitted its racing status, so the existing blur guard correctly did not pause. Added the real racing status; the exact pause assertion stays. Final nearby lane verifies it.
