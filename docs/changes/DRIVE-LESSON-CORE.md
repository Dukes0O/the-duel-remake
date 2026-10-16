---
task: DRIVE-LESSON-CORE
status: done
flag: driving-lessons
player_facing: no
---

# DRIVE-LESSON-CORE: shared lesson pieces for driving lessons

Claude, 15 October 2026. Card `docs/board/cards/DRIVE-LESSON-CORE.md`;
design `docs/DRIVING_LESSONS.md` section 2.

Three pieces move out of `src/heli/` into `src/lessons/` so driving lessons
reuse them. The helicopter keeps every name and behaviour it had.

## Changed

- `src/lessons/lesson-core.js` (new): the step answers (`running`, `passed`,
  `retry`), `lessonOpen(order, done, id)`, the coach timer (`COACH_EVERY` 6 s,
  `tickCoach`, `coachDue`, `coachSaid`) and `passed(lesson, line)` /
  `retry(lesson, line)`, which take the radio line. Pure, imports nothing.
- `src/heli/heli-lessons.js`: keeps `lessonOpen(done, id)` (calls the shared
  one with `LESSON_ORDER`), its goal checks, its `heli.radio.*` lines and the
  `sawLift` reset on a retry; `LESSON_RULES.coachEvery` is `COACH_EVERY`.
- `src/lessons/radio-voice.js` (new): `HELI_RADIO_VOICE` (Brian),
  `RADIO_FILTER`, `softClipCurve` and `createRadioChain` with its click and
  hiss, moved unchanged. `src/heli/heli-audio.js` and
  `src/heli/heli-radio-lines.js` re-export them (`HELI_VOICES.brian` is the
  same object), so every importer is unchanged.
- `src/lessons/lesson-board.js` and `lesson-board.css` (new): the
  instructor's list, rows `{group, id, name, open, done}` in, a
  `<ul class="lesson-board">` out, with a heading per group when there is
  more than one group; the caller names the buttons' data attribute.
  `src/heli/heli-ui.js` keeps the home-pad check, the running-lesson panel,
  the INSTRUCTOR panel and the skip button, and calls it for the list with
  `data-heli-lesson`, so its click handling is unchanged.
- `src/heli/heli-ui.css`: the list rules (`ul`, `li`, done, locked, `small`)
  move to `lesson-board.css` as `.lesson-board` rules with the same values
  and the same selector weight; the panel, button, skip and hold-bar rules
  stay. `src/screen-router.js` imports `lessons/lesson-board.css` after
  `heli/heli-ui.css`.
- `tools/test-heli-lesson-core.mjs` (new; the card named it `test-lesson-core.mjs`, but it reads helicopter files to prove they use the shared pieces, and the import guard already allows `test-heli-*` files, so the guard needs no second change): the contract, the coach timer, the
  shared radio objects, the list (groups, escaping, locked rows, default
  action), the helipad panel wrapping the shared list exactly, and the moved
  styles.

## Changed assertion (reviewed)

- `tools/test-heli-mode.mjs`: the rules-file import check also allows
  `../lessons/lesson-core.js`, which is pure and imports nothing. The page,
  clock, storage and randomness check on rules files is unchanged.

## Checks

`test-heli-lessons` 63, `test-heli-audio`, `test-heli-view` 98,
`test-heli-mode` 154, `test-heli-hooks` 243 and `test-heli-lesson-core` 37 pass;
the helicopter lesson tests are unchanged. Lane tier 164/164 and build on
cb19e5b2; `heli-first-flight` passed (11 pictures, no warnings or errors) and
the helipad instructor board looks as before. One review: one fault (the new
test sat outside the import guard's `test-heli-*` exemption), fixed by the
rename and confirmed.

## Removed

From `src/heli/`: the lesson-open rule, the pass and retry bodies and the coach
countdown in `heli-lessons.js`; the radio filter, soft clip, noise buffer and
radio chain in `heli-audio.js`; Brian's voice record in `heli-radio-lines.js`;
the list markup in `heli-ui.js` and the list styles in `heli-ui.css`. Nothing
is kept twice.
