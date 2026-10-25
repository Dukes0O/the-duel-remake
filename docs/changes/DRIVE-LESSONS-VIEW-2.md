---
task: DRIVE-LESSONS-VIEW-2
status: done
flag: driving-lessons
player_facing: no
---

# DRIVE-LESSONS-VIEW-2: lessons 2 to 4 in the game (switch `driving-lessons`, dev)

Claude (Sonnet 5.5 side session), 24 to 25 October 2026. Card `docs/board/cards/DRIVE-LESSONS-VIEW-2.md`;
design `docs/DRIVING_LESSONS.md` 12.2 to 12.4 and 12.6. Behind `driving-lessons` (dev, needs `tyre-slip`; the
gearbox lesson also needs `engine-curve`). With the switches off nothing here is reachable.

## Picks for the coordinator to confirm (nobody could answer overnight, so each is already built)

1. **The helipad stays lesson 1 alone for now.** The pad's rows, "Race here" offer and `Lesson here` are tested to equal
   the menu's rows (DRIVE-LESSON-HELIPAD), so lessons 2 to 4 are on the menu's Instructor board only. `driveLessonProps()`
   is unchanged (lesson 1); the board uses a new `driveLessonBoardProps()` that adds the other rows. Bringing lessons 2 to 4
   to the pad is a small follow-up: per-row requests in `heliDrivingBoard`, `heliStartDriving` and `_heliLessonAt`, and the
   helipad test's row counts. Recommended: leave it for DRIVE-LESSONS-FINISH-2 or its own card.
2. **Lessons 1, 2 and 4 run without the engine curve even when `engine-curve` is on; lesson 3 runs on it.** Their
   instructors were recorded without it, so the player's car must pull the same way or the instructor's time is not fair.
   `_engineCurveRaceEnabled` is set from the lesson (one line in `startCampaign`). Without a lesson it is the switch, as before.
3. **Shift lights** come on one at a time at 90%, 93.3% and 96.7% of revs (a third of the way each from `GEAR_LESSON.lightsRevs`
   to the limiter); all three are red-hot at the limiter. Each light plays the matching tick (`lesson.shift-light`, `.2`, `.3`).
   The green mark sits at `GEAR_LESSON.greenMarkRevs` (50%). Both are drawn on the HUD's own rev bar from the lesson's own
   file; `screen-hud.js` is not touched.
4. **Row wording.** Shut rows say why: "Opens later: finish lesson N first.", "Opens later: buy <course> or <course>.",
   and for lesson 3 while `engine-curve` is off "Opens later: waiting for the new engines." Finished rows show their best margin in the row
   ("2 The racing line (best 0.40 s faster)"); lesson 1's separate "Best:" line stays when the board is lesson 1 alone (the pad).
5. **Lesson 2's first-try markers are knocked over** when the car's centre passes within 0.8 m (the cone's own tip distance),
   with the cone's knock. Drawing and sound only (a per-step check of the car's position in the lesson's own file).
6. **Lesson 4:** the snow cone is drawn pale blue (so it is not mistaken for the red dry board); the ice sign is the road's own
   sign board (`addSign`, texts WATCH FOR / ICE) at 70% size and 82% opaque, on the outside of the road about 30 m before the ice;
   the winter run's ghost is the winter instructor and its start pose is his.
7. **The running panel is compact now** (420 px wide, streak and Leave on one row). Lesson 1's four-rule list covered the minimap before;
   this fixes it for all four lessons. The scenario checks the panel against the minimap and the instructor's caption.
8. **The browser scenario writes lesson progress into the memory-only temporary career** (lesson 1 done, then 2, then 3) because
   lesson 2 cannot open otherwise and a honest key-driven "three in a row" is not possible. That is the only thing injected. Its
   "look" captures at the end of lessons 2 and 4 set the car down on the instructor's own recorded pose at under 6 mph for the picture
   sheet, then throw the run away; nothing is checked as a result there.

## What a player gets

- **The Instructor board** lists four lessons (rows from `driveLessonBoardModel` with `lessonRows`, `lessonAccess`, `engineCurve`
  from the host: `driveLessonAccess` decides open or shut, a finished lesson can always be retaken, newer-version progress opens nothing).
  Lessons 2 and 3 get a "choose where" list when two of their places exist.
- **Lesson 2 (racing line), Tremblant Woods and Harbour Lights:** try 1 draws the middle markers, try 2 the apex and exit cones; panel,
  result card ("Cones touched n of N"), reward on the third win (one handling level or 600 credits, `finishDriveLesson`).
- **Lesson 3 (gearbox), Panorama Ridge and Tremblant Woods, on the engine curve:** the run is always manual and the limiter cannot hurt
  the engine, whatever the player's setting (`Duel.diff` returns a manual, no-damage copy only while a gearbox lesson is running, so
  Casual's automatic box is back the moment the lesson is left). The run starts in the instructor's gear (2nd at 30 mph). The lesson
  view carries `gear` and `revs` every step. Rev counter: green mark and three shift lights. Result card: the revs of each change up, the gear at the
  exit against the instructor's, time on the limiter.
- **Lesson 4 (snow), Tremblant Snow:** the dry board (red), the snow cone, the inside and exit cones and the ice sign. Three wins on
  summer tyres, then the card offers "Start the winter-tyre run": the next attempt sets the winter tyre from the winter instructor's
  pose and drives against his time; it passes however it ends and gives the tyre reward. Result card: braking point against the
  snow cone (before, after, at it) and the brake pressure on the ice.
- **Radio:** each lesson's intro and pass lines (`drive.radio.<lesson>.intro`, `.pass`), the retake line, the stage lines the lesson
  rules already name, and for lesson 4 the winter explanation then the pass line (`response.queued`). Ghost: the instructor in the challenge,
  and the winter instructor in the winter run.

## Changes outside the owned files (named hooks)

- `src/game.js` (marked DRIVE-LESSONS-VIEW-2): row tables per lesson and the lesson id in `startCampaign` validation (prototype-key safe;
  lesson 3 refused when `engine-curve` is off), `diff` getter, engine-curve latch, winter tyre and start gear in `resetDriveLessonAttempt`,
  `gear` and `revs` in the lesson view.
- `src/app.js`: `startLesson` for any lesson id (access, engine curve, per-lesson wording), `driveLessonBoardProps`, completion and
  retry-save lines per lesson, `playDriveLessonCue`, ghost for the winter run.
- `src/render3d.js`: markers, snow cone colour, dry board for lesson 4, ice sign; the red board is drawn only for lessons 1 and 4
  (lessons 2 and 3 have none, and the old code would have drawn a broken one).
- `src/lessons/drive-lesson-ui.js` and `.css`: everything above on the screen side. The module imports nothing that reads the feature
  catalog (the first version imported the save file and broke lesson 1's native test, which needs the QA flags installed before the game loads).

## Checks

- `tools/test-drive-lessons-view-2.mjs`: 14 checks (board rows and reasons, start requests, panels, result cards, completion for lesson 4's winter
  run and for lesson 3, shift lights and marker knocks, CSS scope; natively: the real App runs lessons 2 and 3 with access, the forced manual box
  on Casual and its return, no engine damage, engine-curve latch, nothing paid; lesson 4's winter tyre and ghost, retake on summer tyres, refusal
  of a lesson on the wrong course and of the gearbox lesson without the engine curve).
- Lessons 1 to 4, save, helipad and lines suites unchanged and passing: `test-drive-lesson-run` 22, `test-drive-lessons` 37, `test-drive-lesson-2`
  16, `test-drive-lesson-save` 16, `test-drive-lesson-helipad` 108 checks. No assertion changed.
- Browser scenario `drive-lessons-view-2` (private port, memory-only saves, 0 errors, 0 warnings): the board's four rows and their reasons;
  lesson 2's middle try (markers drawn, honest result card) and right try (markers hidden, three rules, honest result); lesson 3 (green mark at 50%,
  three lights lit at the limiter, E changes up on Casual, result card numbers, the automatic box and plain rev bar back after leaving); lesson 4 (summer
  tyres, three cones, dry board, ice sign, winter instructor faster, result card numbers, right stage hides the dry board); the panel clear of the minimap.
  Command: `node tools/run-browser-scenarios.mjs --scenarios drive-lessons-view-2 --jobs 1`.
- Picture sheet: `docs/board/looks/drive-lessons-view-2/round-1.jpg` and its note.
- Lane tier `--changed --jobs 4` from PowerShell on the final code: 43 of 43 suites pass, including every replay and world-signature guard
  and all lesson suites (a Git Bash run fails `test-drive-through`, the known tar problem). `npm run build` passes. The final scenario run
  passed `drive-lessons-view-2` and `drive-lesson-run` together.

## Review

One independent code review (a separate reviewer agent, read-only). Confirmed and fixed:
- The lesson screen rebuilt the board's data every simulation step in every race; it now builds it only while the board is open.
- The gearbox test ran on Casual, which has no engine damage anyway, so it could not catch the override going missing. A Pro run now holds
  the throttle in 2nd well past the over-rev time and checks no damage; with the override removed both gearbox tests fail (tried).
- The engine-curve switch is checked again after the instructor run is built (a switch flipped during the build now settles cleanly).
- Knocked lesson 2 markers stayed down only while driving; they now stay down while the result card shows.
- Lesson ids such as `constructor` are refused in the screen code (`Object.hasOwn`).
- The winter tyre no longer outlasts a snow lesson that is left.
- "Retry save" after the winter run now says the winter explanation and the pass line, as the first save does.
It confirmed: ordinary races, replays and saves are untouched with the switches off; the manual box cannot leak out of the lesson; lesson 1
under `engine-curve` now matches how its instructor was built; gating, completion, ghost, radio ids, disposal and escaping are right.

## Not changed

Race physics, replays, world signatures, saves (lessons 2 to 4's save keys came with DRIVE-LESSONS-SAVE-2), the helipad's rows and tests, the pure lesson
rules, the sound bank. No frame timing (rule 9).

## Removed

Nothing.
