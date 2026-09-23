---
task: BUG-10
status: review
kind: gameplay-fix
flag: none
player_facing: yes
---

## What changed

The standard gamepad D-pad fires Wasteland weapons on a new press: Up UFO,
Right bomb, Down crossbow, Left star. Holding a direction does not repeat fire.
The game's normal weapon guards still block use while paused, in another
mode, or during cooldown.

## Evidence

- The new memory-only fake-gamepad test failed before the source change at
  the first Up press: no UFO fired.
- After the source change, `test-gamepad-weapons.mjs` passed 20 checks. It
  resets weapon cooldowns while a direction stays held so cooldown cannot
  hide accidental repeat calls. It also checks pause, mode, disconnect and
  unchanged driving inputs.
- `test-keyboard-steering.mjs` passed 96 checks with the same
  `cfe859d2a6aea7e9` trajectory fingerprint.

## Behavior and test changes

No existing assertion changed. New D-pad actions use the keyboard weapon
order 1-4, clockwise from Up. Keyboard, camera, gear, analog steering and
pedal mappings are unchanged. The weapon bar/help text should show the new
gamepad mapping during BUG-11 UI cleanup.
