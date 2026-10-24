# DRIVE-LESSON-HELIPAD: driving lessons from the helipad (switches `driving-lessons`, `tyre-slip`, `helicopter`)

Section 12.6 of `docs/DRIVING_LESSONS.md`. With either driving switch off, or the helicopter off, the
helipad is exactly as before: the same markup byte for byte, no new offer, no new button.

## What was built

- **The Driving group** on the helipad's instructor board (`src/heli/heli-ui.js`, `lessonsMarkup(view,
  board, {driving})`): the menu's own rows (`driveLessonBoardModel`) for the home pad's course and the car at the
  pad, drawn by the shared `lesson-board.js` under the helicopter lessons. Two groups get headings; one group
  (the switch off) gets none, as today. A closed row says why under the list.
- **Starting from the pad**: choosing the row calls `app.heliStartDriving`, which ends the helicopter visit
  (the same way Race here does) and runs the menu's own `startLesson` with the pad's course and car, on the
  open lesson board. Everything after is the menu's flow: the instructor's run, the lesson, the save.
- **The air-only rule**: an air-only car takes a lesson only on the course it was last set down on. At the pad
  with that car away, its row is closed and the note reads "Your <car> is at <course>." (the helicopter's own
  course names). Nothing starts and the visit goes on. Race here's existing rule is unchanged.
- **Lesson here**: `session.lessonHereOffer()` (`heli-session.js`) answers with the lesson the app names for the
  course and car of the Race here offer, so it appears with it and is withdrawn with it (hooking the car again,
  or leaving). `heli-board.js` draws "Lesson here: <lesson>" beside "Race here" and routes its click to
  `app.lessonHere`. The app names a lesson only when the course has a lesson row, the car can take it, and it
  is open and not yet done. The session gets the answer by an option (`drivingLessonAt`), so the helicopter
  rules import nothing new (the import rule in `tools/test-heli-mode.mjs` holds).
- **App hooks** (`src/app.js`, beside `raceHere`): `heliDrivingBoard`, `heliStartDriving`, `lessonHere`,
  `_heliLessonAt`, `_driveFromHeli`, `_airOnlyBlocked`, and one option in `visitHeli`. See the question file.

## Checks (Linux cloud)

- `tools/test-drive-lesson-helipad.mjs`: 103 checks. A real headless flight sets the player's car down at
  Panorama Ridge and the offers appear together, sit side by side on the board and both vanish when the car is
  hooked again; no lesson row (Tremblant Snow) means no offer; with no provider the session and the board are
  byte for byte as before. The rows equal the menu's, closed rows carry the menu's words, a done lesson reads
  Retake and newer-version progress closes the row. The air-only rule refuses with the car's whereabouts and
  keeps the visit. Starting leaves the visit and calls `startLesson` once with the pad's course and car; Lesson
  here does the same on the offered course. Each of the three switch combinations that leaves driving lessons
  off changes nothing.
- The tests that start a lesson run the real `startLesson` through the real helicopter UI (a small fake page
  element catches the click), not a stub.
- Every existing helicopter suite is unchanged. Lane tier and build: see the end of this note.
- Not run here: a browser look at the board (the card has none; the rows are the shared list).

## Lane tier and build

Run once on the final code with current `integration/wasteland` (132c46f5) merged: lane tier `--changed --jobs 8
--keep-going`: 40 of 44 suites pass, including this card's test, every helicopter suite
(`test-heli-mode`, `-jobs`, `-view`, `-lessons`, `-lesson-core`, `-hook-window`, `-fire`, `-fire-session`,
`-rescue-session`, `-skin-session` and the rest), `test-drive-lesson-run` and the replay guards. The four
failures are laptop-only suites: `test-course-kit`, `test-earned-cars-ui`, `test-drive-through`, `test-medals`.
`npm run build` passes. Not run here: browser scenarios and Windows-only suites.

## Review

One independent code review (rule 17). It found one blocker and two small faults, all fixed and tested:
(1) the pad passed the car as `carId` but `startLesson` reads `car`, so in the real app the lesson never started
(the menu's UI renames it); the test's stub hid it, and the tests now run the real `startLesson`; (2) the lesson board's selected
course was not set, so a failed preparation would land on a board showing another course; (3) "Lesson here" was
offered on a course closed by fire and then refused; it is now withheld. It confirmed: switches off change nothing
(same markup byte for byte, no offers), double clicks and the ended visit are safe, the air-only rule cannot be
bypassed and does not refuse wrongly, the shown car and course are the ones used, escaping, and the heli import
rule holds. Left as it is: a closed air-only row shows a finished lesson as "Opens later" (the note says why).

## Removed

Nothing.
