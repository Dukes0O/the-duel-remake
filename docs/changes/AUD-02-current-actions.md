---
task: AUD-02
status: integrated-slice
kind: sound-refinement
flag: wasteland2
player_facing: yes
scope: current foot weapons and roadside raiders
---

This is a bounded implementation slice of the sound direction in `SPEC.md`
sections 3.11 and 12.2. The earlier `AUD-02.md` measurement note remains
separate and unchanged. This slice does not complete the full sound card.
Integrated at `6898579`.

## What changed

The current on-foot RPG has a short launcher sound. Its direct hit and ground
burst have slightly different, positioned impacts. An RPG impact replaces the
large bomb blast sound for that event; bombs keep their existing blast.

Wrench repair has distinct start, completion and interruption sounds. An
interruption is emitted once when an active repair is released or disrupted.
The roadside warning and each raider shot also have short sounds. A shot
carries the raider's position so it pans toward the shooter.

These cues use the existing Web Audio noise and oscillator paths. They add no
asset, dependency, network request, save field, score event or race rule. The
new event fields describe sound only. Ordinary and flag-off racing keep their
existing weapon sounds.

## Checks

- `node tools/test-weapon-audio.mjs` passed: eight distinct foot and raider
  variants, four existing car cues, short source lifetime, bounded gain,
  spatial direction, ordinary racing, mute and pause.
- `node tools/test-onfoot-weapons.mjs` passed: 5 tests, including a direct RPG
  sound event and one interruption event for a disrupted repair.
- `node tools/test-raiders.mjs` passed: 4 tests, including shot position and
  unchanged player score ownership.
- `npm run build` passed. `git diff --check` passed.

No existing assertion was weakened. A full race mix recording and listening
pass remain open for the overall AUD-02 card, as do sounds for weapons that
are not yet implemented. No full suite or browser run is claimed for this
bounded slice.
