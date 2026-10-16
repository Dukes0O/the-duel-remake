# DRIVE-LESSON-HOOKS

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Codex. Packet sections 2 (the Instructor button), 3.2, 3.6 and 5. Needs
DRIVE-LESSON-1, DRIVE-LESSON-SAVE and DRIVE-LESSON-LINES.

The one wiring card for the race side, holding `busy-game-files` once:

- `src/feature-flags.js`: `driving-lessons: 'dev'` (the feature-flags test
  count rises by one; explain it in the change note).
- `src/game.js`: lesson options on a Time Trial through `startCampaign`
  (no rival, traffic, police, combat, pay, records, ghost saving, medals or
  damage cost; slip rules fixed on); the attempt reset at the start gate
  with the rolling speed.
- `src/app.js`: `startLesson`, the Instructor button on the main menu
  (shown only with `driving-lessons` and `tyre-slip` on) opening the board
  with the Driving group, Enter for the next attempt, Leave lesson on the
  pause screen, the result card and lesson panel, the radio lines, the save
  calls and the reward.
- `src/render3d.js`: cones, the red board and the instructor's ghost, drawn
  from the lesson's lists.

Not in this card: the helipad's board (the helicopter's session and screen
are Claude's; DRIVE-LESSONS-NEXT plans it).

Owns: `src/lessons/drive-lesson-ui.js`, `drive-lesson-ui.css`,
`tools/test-drive-lesson-run.mjs`, a browser scenario under
`tools/scenarios/`, `docs/changes/DRIVE-LESSON-HOOKS.md`.
Hooks: the files above, `src/screen-menu.js` (one button),
`src/screen-router.js` (one import for `drive-lesson-ui.css`), `src/lessons/lesson-board.js`
(the Driving group rows).
Locks: `busy-game-files`.

Acceptance: packet section 10's D1 acceptance; a lesson run without drawing
on Panorama Ridge from the menu verb through the reward; race replays,
world signatures and combat balance unchanged; the browser scenario
(private port, memory-only storage) shows the board, cones, panel and
result card; lane tier, build, one review.
Removed: nothing.


## Independent presentation source while native checks wait

Kyle directly instructed that every possible parallel part should proceed.
Start this existing card's owned drive-lesson-ui.js, drive-lesson-ui.css,
existing test-drive-lesson-run.mjs and own note as a pure presentation slice.
Use actual settled lesson/car/course/result data; no fake instructor or
pretend passing state. Reuse the shared lesson board. Complete useful board,
HUD/rule/streak and result markup/styles plus callbacks for later host wiring.
No App/game/renderer/save/feature-flag/screen hook edit now, no busy-game-files
lease held. DRIVE-LESSON-1/SAVE/LINES remain final wiring/acceptance/merge
dependencies. Later actual host wiring takes the core lock once and proves
native reward isolation. Presentation source can build while instructor and
Tyre native validation wait; it grants no native/UI/live acceptance.
