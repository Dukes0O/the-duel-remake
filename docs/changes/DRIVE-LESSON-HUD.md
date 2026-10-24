# DRIVE-LESSON-HUD: a lesson shows only what applies

From Claude's reading of the `drive-lesson-run` browser pictures: during a lesson
the race screen still showed the Time Trial "TT / Record your ghost" banner, the
lap count and the style points, and the instructor's caption sat over the minimap.

## What changed

- `src/screen-hud.js`: one line puts an `is-lesson` class on the race stage while
  `app.duel.drivingLesson` exists, and only then.
- `src/screen-hud.css`: under `.is-lesson` the banner (`.race-position`), the lap
  readout (`.lap-readout`), the minimap's own lap count (`#route-lap`) and the
  style points (`#style-score-panel`) are hidden. Speed, gear, the race time,
  the minimap and the lesson panel stay.
- `src/lessons/drive-lesson-ui.css`: while driving, the instructor's caption (and
  the "instructor is driving" message) sits top right, in the space the banner
  left free, instead of stacked under the panel. Below 900 px wide it moves to
  the top, full width. The result card layout is unchanged.
- Nothing changes with the switch off or in any non-lesson race: the class is
  only ever set from `drivingLesson`.

## Checks (Linux cloud)

- Real browser (Chromium, a private dev server, memory-only storage) through the
  same steps as the scenario, at 1280×720, 1024×768 and 1920×1080: the four
  elements are `display: none`; speed, gear and the minimap are visible; the
  caption does not overlap the minimap, the lesson panel, the rear-view mirror or
  the race clock. (At 1280×720 the panel ends at y 320 and the minimap starts
  at y 320; on windows shorter than about 700 px the panel itself meets the
  minimap, as it did before this card.)
- `tools/test-drive-lesson-run.mjs`: 22 of 22 (two new tests: the hide rule and
  its source are exactly as above, and the caption placement rule). No existing
  assertion changed.
- Browser scenario `tools/scenarios/drive-lesson-run.mjs` gains the card's check
  (the four elements hidden, speed/gear/minimap shown, the caption not
  overlapping the minimap or the panel). Syntax-checked here only; the laptop
  runs it: `node tools/run-browser-scenarios.mjs --scenarios drive-lesson-run`.
- Lane tier `--changed --jobs 8 --keep-going`: 43 of 46 suites pass. The three
  failures are Windows-only and unrelated (`test-earned-cars-ui`, `test-medals`,
  `test-course-kit`: "test cleanup requires the Recycle Bin"); the laptop should
  run them. `npm run build` passes.

## Removed

The caption's old stacked-under-the-panel placement (its flow position in the
host) is replaced by the fixed top-right rule. Nothing else.
