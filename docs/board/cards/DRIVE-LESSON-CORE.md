# DRIVE-LESSON-CORE

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Claude, 14 October 2026 (the Flying line is Claude's). Packet section 2.

Move three pieces out of `src/heli/` into `src/lessons/` so driving lessons
reuse them. The helicopter keeps every name and behaviour it has today:

- `src/lessons/lesson-core.js`: the step answer ("running", "passed",
  "try again" plus a radio id), `lessonOpen(order, done, id)`, the coach
  timer, and `passed(lesson, line)` and `retry(lesson, line)` taking the
  radio line as an argument. `heli-lessons.js` keeps a two-argument
  `lessonOpen(done, id)` that calls the shared one with `LESSON_ORDER`, and
  keeps its own `heli.radio.*` lines and `sawLift` reset.
- `src/lessons/radio-voice.js`: `createRadioChain`, `RADIO_FILTER`,
  `softClipCurve`, `HELI_RADIO_VOICE`; `heli-audio.js` and
  `heli-radio-lines.js` re-export them.
- `src/lessons/lesson-board.js` and `lesson-board.css`: the list part of
  the instructor's board, plain rows (group, id, name, open, done) in, the
  list out. `heli-ui.js` keeps the home-pad check, the running-lesson panel
  and the skip button, and calls it for the list.

Owns: `src/lessons/lesson-core.js`, `radio-voice.js`, `lesson-board.js`,
`lesson-board.css`, `tools/test-heli-lesson-core.mjs`,
`docs/changes/DRIVE-LESSON-CORE.md`.
Hooks: `src/heli/heli-lessons.js`, `heli-audio.js`, `heli-radio-lines.js`,
`heli-ui.js`, `heli-ui.css` (the moved styles), `src/screen-router.js` (one
style import for `lesson-board.css`, so the helipad board keeps its look),
and the allowed-imports list
in `tools/test-heli-mode.mjs` (about line 358: add the `../lessons/` files).

Acceptance: `test-heli-lessons`, `test-heli-audio`, `test-heli-view` and the
rest of `test-heli-mode` pass unchanged; the import check's allowed list is
the one changed assertion, explained in the change note; the helipad board
looks the same; lane tier, build, one review.
Removed: the moved code from `src/heli/` in the same change.
