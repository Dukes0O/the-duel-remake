# DRIVE-LESSON-HELIPAD

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics; the helicopter is Claude's
line). Packet D2, section 12.6. Switches `driving-lessons`, `tyre-slip` and
`helicopter`. Needs DRIVE-LESSON-HOOKS.

- The helipad's instructor board (`src/heli/heli-ui.js`, the list part
  already uses `src/lessons/lesson-board.js`) shows the Driving group under
  Flying, with the same open, done and "Opens later" rows as the menu's
  board.
- Choosing a driving lesson there calls the same `startLesson` the menu
  uses, with the car standing at the pad. A special car that travels only by
  air may take a lesson only on the course where it was last set down; its
  rows elsewhere read "Your <car> is at <course>".
- "Lesson here": after the player's own car is set down on an owned course
  with a lesson row, `heli-session.js` offers the next open lesson on that
  course beside "Race here"; hooking the car again or leaving withdraws it,
  as for "Race here".
- `tools/test-drive-lesson-helipad.mjs`: the board rows match the menu's;
  the air-only rule; the offer appears and withdraws like "Race here"; with
  `driving-lessons` off the helipad is exactly as today.

Owns: `tools/test-drive-lesson-helipad.mjs`,
`docs/changes/DRIVE-LESSON-HELIPAD.md`. Hooks: `src/heli/heli-ui.js`,
`src/heli/heli-session.js`, `src/heli/heli-board.js`. Locks: none (the
helicopter files are Claude's line; check no other helicopter card holds
them). Sound: existing interface sounds. Art: none.

Acceptance: the test, every existing helicopter suite unchanged, lane tier,
build, one review. Removed: nothing.
