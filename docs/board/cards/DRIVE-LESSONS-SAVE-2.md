# DRIVE-LESSONS-SAVE-2

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). Packet D2, section 12.9.
Switch `driving-lessons`. Can start now.

- `src/lessons/drive-lesson-save.js`: accept the keys `line`, `gears` and
  `snow` in `done`, `best` and `rewarded`; lesson order corner, line,
  gears, snow (gears shows "Opens later" while `engine-curve` is off, and
  snow then opens after line).
- Rewards on first pass: line gives one handling level, gears one engine
  level, snow one tyre level on the car passed in, or 600 credits when that
  upgrade is already at level 3; once each.
- Fixture `tools/fixtures/saves/11-driving-lessons.json` gains a player with
  all four done; the save checker.
- `tools/test-drive-lesson-save.mjs`: new cases for the three keys, the
  order, each reward once, old saves unchanged.

Owns: `docs/changes/DRIVE-LESSONS-SAVE-2.md`. Hooks:
`src/lessons/drive-lesson-save.js`, the fixture, the test (new cases only).
Locks: `save-shape`. Sound: none. Art: none.

Acceptance: the test, the save checker, lane tier, build, one save review.
Removed: nothing.
