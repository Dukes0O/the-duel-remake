# LAB-RULES

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). LAB sections 3, 4, 9 and 10.
Switches `lab` and `lab-tuning` (both dev). Can start now.

- `src/feature-flags.js`: `lab: 'dev'`, `lab-tuning: 'dev'` (the switch
  inventory tests gain two rows; Claude's written review on this card: two
  switches added, nothing loosened).
- `src/lab/lab-lessons.js`: the 16 lessons of section 4 with their group,
  order and when each opens (section 3), reading the helicopter lessons,
  driving lesson 1 and the H5 switch; `lessonRows(profile, flags)` for the
  shared board in `src/lessons/lesson-board.js` (groups Flying, Workshop,
  Wind tunnel, Snow).
- `src/lab/lab-shop.js`: the upgrades of section 4 with prices, what opens
  each, and `buyUpgrade(profile, id)` (credits checked and taken once, cap
  kept). Engine 2 needs Engine 1. Free rewards are granted on pass.
- `src/lab/lab-save.js`: `profile.lab` of section 9 in `normalizeProfile`,
  every key optional, unknown keys kept; `passLesson`, `setRing`,
  `setCable`, `setTune`, `recordStockLap`, `payTunedBonus` (once per
  course), `markSecret`. Fixture `tools/fixtures/saves/<next free>-lab.json`;
  the save checker.
- `heliUpgrades(lab)` in `src/lab/lab-heli.js`: `{thrustFactor, emptyMassKg,
  hookLimitKg, lineLengthM, bucketLitres, ringIndex, retardant,
  altitudeScaleM}`, with every value equal to today's when nothing is owned.
- `tools/test-lab-rules.mjs`: opening order, prices, buying once, Engine 2
  after Engine 1, `heliUpgrades` of an empty Lab equals today's numbers,
  old saves read as an empty Lab, switch off changes nothing.

Owns: the files above, `docs/changes/LAB-RULES.md`. Hooks:
`src/feature-flags.js`, `src/profile.js` (or wherever `normalizeProfile`
lives: one line). Locks: `save-shape`.
Sound: none (passing and buying use the existing sounds). Art: none.

Acceptance: the test, the save checker with the fixture, lane tier, build,
one save review. Removed: nothing.

## Claude answers

Settled 24 October: (1) an optional `ringBest` (0..3) sits beside `ring`; old saves
read 0 and `ring` is never above it (LAB.md section 9 updated). (2) All four
helicopter lessons open the Flying group.
