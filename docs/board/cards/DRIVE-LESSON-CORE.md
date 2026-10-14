# DRIVE-LESSON-CORE

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Claude, 14 October 2026 (the Flying line is Claude's). Packet section 2.

Move three pieces out of `src/heli/` into `src/lessons/` so driving lessons
reuse them, with the helicopter's behaviour unchanged:

- `src/lessons/lesson-core.js`: the lesson contract (`running`, `passed`,
  `retry` plus a radio id), `lessonOpen(order, done, id)`, the coach timer,
  the `passed` and `retry` helpers. `heli-lessons.js` imports them.
- `src/lessons/radio-voice.js`: `createRadioChain`, `RADIO_FILTER`,
  `softClipCurve` and the voice (Brian). `heli-audio.js` and
  `heli-radio-lines.js` import or re-export them.
- `src/lessons/lesson-board.js`: the instructor's board markup, with a
  Flying group and an empty Driving group; `heli-ui.js` calls it.

Owns: `src/lessons/lesson-core.js`, `radio-voice.js`, `lesson-board.js`,
`tools/test-lesson-core.mjs`, `docs/changes/DRIVE-LESSON-CORE.md`.
Hooks: `src/heli/heli-lessons.js`, `heli-audio.js`, `heli-radio-lines.js`,
`heli-ui.js` (imports only), the helicopter import guard test (allow
`src/lessons/`).

Acceptance: `test-heli-lessons`, `test-heli-mode`, the helicopter audio and
UI tests pass with no changed assertion; the board markup for the Flying
group is byte-identical; lane tier, build, one review.
Removed: the moved code from `src/heli/` in the same change.
