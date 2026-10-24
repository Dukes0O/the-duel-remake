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
- Every existing helicopter suite is unchanged. Lane tier and build: see below.
- Not run here: a browser look at the board (the card has none; the rows are the shared list).

## Removed

Nothing.
