# DRIVE-LESSON-HOOKS: driving lessons in the game (switch `driving-lessons`, dev)

Puts lesson 1 (braking at the corner) into the game behind the `driving-lessons`
switch, which stays `dev` and needs `tyre-slip` on as well. Nothing here is
reachable with the switches off, and ordinary races, replays, world signatures
and combat balance are unchanged.

## What a player gets

- **Instructor button** on the main menu (`#driving-instructor`), shown only
  with `driving-lessons` and `tyre-slip` both on. It opens the lesson board
  (the shared board, Driving group) listing the lesson corners the player owns,
  with their own car and Casual/Pro setting.
- **The run**: `App.startLesson` asks `buildInstructorRun` for the instructor's
  clean native run once (same car, upgrades and driver), then starts a Time Trial
  through `Duel.startCampaign({lesson})`: no rival, traffic, police, combat,
  pay, records, ghost saving, medals or damage cost; tyre slip rules on. Each
  attempt resets to the start gate rolling (`resetDriveLessonAttempt`, using the
  instructor's own first pose including its starting yaw). Enter starts the next
  attempt; Leave lesson is on the pause screen and the lesson panel.
- **Drawn from the lesson's lists** (`render3d.js`): the three cones (tipped
  ones fall), the red board on the first (late-try) stage and the instructor's
  ghost from its recorded positions. None of it touches race state.
- **Panel and result card** (`drive-lesson-ui.js/.css`): try, the four rules,
  streak 0/3; the result shows times to the hundredth, time lost or gained,
  screech, or distance reached and why an unfinished attempt ended.
- **Radio lines and reward**: the lines map to the existing cue list; passing
  three in a row calls the lesson-save API once (one free brake level, or 600
  credits when that car's brakes are maxed). A failed profile save keeps the
  reward in memory for the session, says so, and a retry persists the same
  profile without paying again.

## Changes outside the owned files (named hooks)

- `src/feature-flags.js`: `driving-lessons: 'dev'`.
- `tools/test-feature-flags.mjs`, `tools/test-wasteland-beta.mjs` and course-kit's
  copy of the inventories: the new switch row and the non-course count 32 to 33
  (Claude's written approval on the card, 16 October 10:00; nothing is loosened,
  the lists must name every switch).
- `src/game.js`: `startCampaign({lesson})`, `resetDriveLessonAttempt`, a lesson
  step that uses the native driving, jump and swept contacts only. The lesson
  lives outside the ordinary race snapshot so flag-off state is identical.
- `start-preview.bat`: `driving-lessons` added to the private preview's flag list
  (the existing preview-launcher test requires every dev switch to be requested).
- `src/app.js`, `src/render3d.js`, `src/screen-menu.js` (one button),
  `src/screen-router.js` (one CSS import).

## What changed in this session (24 October)

- Merged current `integration/wasteland` (the new lesson rules, Summit rescues).
- `tools/test-drive-lesson-run.mjs` native App test: the scripted student now
  drives the instructor's own line and speed plan (`lessonPlanFor`), as in
  DRIVE-LESSON-1; the old racing-line plan was removed. The late-try assertion
  follows Claude's reviewed change on the DRIVE-LESSON-1 card (screech of at
  least 0.5 s and the late-try radio line; the 0.25 s time-loss clause is gone,
  since braking late costs no time on these tyres).
- The late-try result line: the old `drive.radio.corner.late.result` ("Look at
  the time you lost") would be untrue, since the late try finishes faster. The
  late try now plays the existing `drive.radio.corner.coach.screech` ("I heard
  the tyres. Brake a little earlier and keep it smooth.") when it screeched at
  least 0.5 s, `late.early` if it braked before the board, and no line otherwise;
  the result card carries the numbers. `late.result` stays in the catalog,
  unused, until backlog card DRIVE-LESSON-LATE-LINE (owner claude) records a
  replacement. New pure test for the three cases.
- `docs/DRIVING_LESSONS.md` sections 1, 3.8, 6 and 10 now say the late try is
  judged by at least 0.5 s of screech and its radio line, with Claude's wording
  (sliding throws away grip; brake at the board and the car turns in clean).
- The attempt reset starts the car with the yaw the instructor started with
  (`yawVelocity` is now recorded on its first pose), so the right try is the
  instructor's run exactly. This removes `game.js`'s import of the racing line.

## Checks

- `tools/test-drive-lesson-run.mjs`: 20 of 20 pass, including the native App
  case: real menu entry, late, right, fast, slow-resets, three wins, once-only
  durable reward, no ordinary pay/record/ghost writes, other player untouched,
  leave. `tools/test-drive-lessons.mjs`: 36 of 36 pass.
- Lane tier `--changed --jobs 8 --keep-going` (Linux cloud): 290 suites pass.
  The failures that remain are Windows-only and unrelated: `test-course-kit`,
  `test-earned-cars-ui`, `test-medals` and `test-drive-through` ("test cleanup
  requires the Recycle Bin"), `test-full-check` (needs `pwsh`), `test-salt-flats`
  (a `C:\` art library path) and `test-salt-flats-art` (needs Blender). The two
  real failures it found are fixed: the lines test (a design-table row I had
  reworded) and the preview-launcher test (`start-preview.bat` above); both pass.
  Replay, world-signature and combat-balance guards pass. `npm run build` passes.
- **Browser scenario for the laptop to run**: `tools/scenarios/drive-lesson-run.mjs`
  (private port, memory-only storage). It uses the funded temporary career,
  buys Panorama Ridge, opens the board from the Instructor button, checks the
  second player cannot start it, starts the native instructor, checks the drawn
  cones, red board and panel, holds W for a real late attempt, checks the result
  card and that the profile is unchanged, then Next and Leave. It was syntax
  checked here only (the browser harness needs Windows and the Recycle Bin).
  Run: `node tools/run-browser-scenarios.mjs --scenarios drive-lesson-run`.
- Not run here: the seven Windows-only suites above, every browser scenario, and
  the full tier. The laptop should run them.

## Not changed

Race physics, replays, world signatures, combat balance, course registry,
saves (the lesson save API already merged with DRIVE-LESSON-SAVE). The helipad's
board is a later card (DRIVE-LESSONS-NEXT).

## Removed

The racing-line speed plan in the native student test; `game.js`'s import of
`racing-lines` for the lesson reset (replaced by the instructor's recorded yaw);
the old change-note history (superseded by this note); the time-lost claims in the design document.
