---
task: FOOT-03
status: integrated
kind: combat-feature
flag: wasteland2
player_facing: yes
---

# On-foot controls and camera

Wasteland2 fighters now move with WASD, sprint with Shift, jump with Space,
and turn and aim with the mouse. A click on the race view locks the pointer;
Escape releases it and pauses. F still holds to re-enter the car. The left
gamepad stick moves, the right stick looks, A jumps, X re-enters, and the
triggers supply fire and aim states to the fighter input seam. Mouse buttons
also supply fire and aim states for the later weapon cards.

The camera follows the fighter from a 1.62 m eye height, clears the terrain,
and immediately returns to the selected car view on re-entry. The parked car
stays visible. This uses the existing `Duel.setFighterInput()` seam and does
not expose fighter controls in ordinary, time-trial, objective or flag-off
races. Rendering only reads fighter state.

## Verification

- `node tools/test-onfoot-controls-camera.mjs`: focused keyboard/gamepad,
  fixed-step fighter motion, look and terrain-clear camera check passes.
- `node tools/browser-harness.mjs scenario onfoot-controls-camera`: one private
  browser flow checks exit, pointer lock, mouse look, walking, foot HUD,
  camera follow, re-entry and Escape release/pause with memory-only saves.
- `npm run build` and `git diff --check` pass in the isolated worktree.
- No old assertion or race fingerprint changed. No broad test tier ran.

## Follow-up

Fire and aim are state hooks only until the on-foot weapon card connects
them. The local first-person camera needs the player figure hidden from that
camera when FOOT-04 integrates; other figures remain visible.
