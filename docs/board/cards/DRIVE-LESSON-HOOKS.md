# DRIVE-LESSON-HOOKS

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Codex. Packet sections 2 (where you meet the instructor), 3.2, 3.6 and 5.
Needs DRIVE-LESSON-1, DRIVE-LESSON-SAVE and DRIVE-LESSON-LINES.

The one wiring card for the race side, holding `busy-game-files` once:

- `src/feature-flags.js`: `driving-lessons: 'dev'` (the feature-flags test
  count rises by one; explain it in the change note).
- `src/game.js`: lesson options on Time Trial (no rival, traffic, police,
  combat, pay, records, ghost saving, medals or damage cost; slip rules
  latched on); the attempt reset at the start gate with the rolling speed.
- `src/app.js`: `startLesson`, the Instructor button on the main menu
  (shown only with `driving-lessons` and `tyre-slip` on), Enter for the next
  attempt, Leave lesson on the pause screen, the result card and lesson
  panel, the radio lines, the save calls and the reward.
- `src/render3d.js`: cones, the red board and the instructor's ghost, drawn
  from the lesson's lists.
- The Driving group on the board (`src/lessons/lesson-board.js`), and from
  the helipad a driving lesson starts like "Race here".

Owns: `src/lessons/drive-lesson-ui.js`, `drive-lesson-ui.css`,
`tools/test-drive-lesson-run.mjs`, a browser scenario under
`tools/scenarios/`, `docs/changes/DRIVE-LESSON-HOOKS.md`.
Hooks: the files above, `src/screen-menu.js` (one button),
`src/lessons/lesson-board.js` (the Driving group).
Locks: `busy-game-files`.

Acceptance: packet section 10's D1 acceptance; a headless lesson run on
Harbour Lights from the menu verb through the reward; race replays, world
signatures and combat balance unchanged; the browser scenario (private
port, memory-only storage) shows the board, cones, panel and result card;
lane tier, build, one review.
Removed: nothing.
