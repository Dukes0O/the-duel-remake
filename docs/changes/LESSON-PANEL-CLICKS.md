# LESSON-PANEL-CLICKS

Two faults found by QA-LESSON-SCENARIOS, fixed: panel buttons now take a normal
mouse click while the car moves, and the lesson panel no longer covers the
minimap at 1280 x 720. No game rule, test assertion or limit changed.

## What changed

- `src/lessons/drive-lesson-ui.js`: the running screen is no longer rebuilt as
  new text every frame. A small `patchNode` / `patchChildren` pair compares the
  new screen with the old one and changes only the text, attributes and classes
  that differ (target box numbers, gap, corner lights, caption, the lit step),
  so the Skip, step, help and Leave buttons stay the same elements from mouse
  down to mouse up. The briefing, board and result card are rebuilt only when
  they change, as before, and focus is put back on the same button then. A
  clicked step button still blurs so the keys drive the car. The panel markup
  puts the "what counts" line and the buttons on one row.
- `src/lessons/drive-lesson-ui.css`: the panel is 900 px wide (was 770), with
  tighter padding and one row for the line and buttons, so it is about 80 px
  tall (was 118). The Watch me caption is 600 px wide (was 640).
- `src/render3d.js`: removed the branch for lesson markers (stage name `late`).
  Nothing draws markers any more.
- `tools/scenarios/drive-lesson-run.mjs`, `drive-lessons-view-2.mjs`: back to
  1280 x 720; the freeze-before-click workaround is gone. Skip in Watch me and
  the step button in Follow me are now clicked with a real 100 ms press and
  release while the car moves, and the scenario fails if they do nothing. The
  panel and the Watch me caption must clear the minimap. After the click check
  each scenario starts a clean Follow me run, because the restarted run had no
  driver for its first second.

## Numbers

Real 100 ms clicks on the step button, car moving, lesson 4 (6 tries each):

| Where | Before | After |
| --- | --- | --- |
| Watch me, step button | 1 of 6 | 6 of 6 |
| Follow me, step button | 1 of 6 | 6 of 6 |
| Watch me, Skip | 0 of 1 | 1 of 1 |

Panel against minimap at 1280 x 720: 27 px overlap before; now the panel ends
more than 10 px above the minimap and the caption clears it sideways. At 1366 x 768
the gap grows from 1 px to about 40 px.

## Checks

- `run-browser-scenarios.mjs --scenarios drive-lesson-run,drive-lessons-view-2,lessons-v2-view --jobs 3`
  at 1280 x 720: all three pass.
- `test-drive-lessons` 8/8, `test-drive-lesson-run` 20/20, `-lines` pass,
  `-2` 28/28, `-3` 15/15, `-4` 4/4, `test-drive-lessons-view-2` 9/9.
- `test-drive-lesson-helipad` fails with
  `Cannot read properties of null (reading 'getContext')` in
  `src/heli/pilot-map-view.js`. It fails the same way on the unchanged base, so
  it is not from this change. It needs its own card (the pilot map expects a
  canvas the test's stand-in page does not have).
- Lane tier (--changed --jobs 4 --keep-going): 39 suites passed, 1 failed (the helipad suite above, same on the base). 
pm run build: built.

## Changed assertions

None in game tests. The two scenarios gained the click checks above.

## Removed

- The scenarios' freeze-before-click workaround and 1366 x 768 viewport.
- The marker branch in `src/render3d.js`. `markersKnocked` in
  `drive-lesson-ui.js` is still exported and tested; it can go with the next
  lesson card that touches `test-drive-lessons-view-2`.

## Claude's review (28 October 2026, night)

In-place patching keeps buttons alive from press to release (6 of 6 real clicks while moving, was 1 of 6); the panel clears the minimap at 1280x720; the scenarios now check a real click. No assertion changed. The helipad failure is on integration and is being fixed in QA-HELIPAD-MAP-CANVAS. Verdict: merge.
