# HELI-LESSONS

The skippable opening and lessons 1 to 4 with the instructor
(docs/HELICOPTER.md section 7), plus the page parts they need: the
instructor's board, the dispatch board mounted beside it, and every car
and the crate drawn in the scene.

## What landed

- `src/heli/heli-lessons.js`: the four lessons' pass checks, coaching and
  retries, and what each lesson opens.
- `src/heli/heli-session.js`: lessons run in the session (start on the
  pad, retake, stop, skip the opening), the crate and its circle placed by
  `courseSite`, the opening's radio lines for a new pilot, and the gates:
  the pump after the free tank and the dispatch board open with lesson 3
  (a nearly empty tank can always be filled), carrying cars opens with
  lesson 4. The lesson crate is not a car and skips the car list.
- `src/heli/heli-ui.js` and `heli-ui.css`: the instructor's board on the
  pad (each lesson's state, Start or Retake, Skip the opening), the
  running lesson's goal with a hold bar and Stop, notices for passes,
  retries, jobs; the dispatch board (HELI-DISPATCH's `heli-board.js`)
  mounted and styled, shown once lesson 3 is done.
- `src/heli/heli-scene.js`: customers' cars drawn with the game's own car
  models (`createVehicleAssets`), the crate, the hover ring and the crate's
  circle during lessons; the race renderer always gets the player's own
  car, so it never draws the wrong car on the cable (HELI-DISPATCH
  review's note).
- `docs/HELICOPTER.md` section 7: the numbers this card settled.

## Checks

- `node tools/test-heli-lessons.mjs`: 60 checks pass. The rules on their
  own; a new pilot hears the opening, gets the free tank, finds the board
  and lesson 2 closed; lessons 1, 2, 3 and 4 flown headless by a scripted
  pilot (lift-off, hover, landing on the H, the crate hooked, carried
  about 200 m and set down in its circle), each saved and opening the next;
  the dispatch board opens with lesson 3; skipping marks lessons 1 and 2;
  retaking; cars cannot be carried before lesson 4 and the reason says so;
  the pump's gate; a hard landing in Real means try again.
- `node tools/test-heli-view.mjs`: 77 checks (the instructor's panel).
- Browser (`heli-first-flight`, private port, memory-only): the
  instructor's board and the skip button for a new pilot, lesson 1 started
  from its button and running, then the whole earlier flight; 10 pictures,
  0 errors. Claude looked at the pad and lesson pictures; deleted after.
- Review (rule 17): one independent reviewer found five real faults: a
  small hop on the H passed lesson 3, a crash never meant "try again", the
  Stop button could miss clicks while the hold bar moved, skipping saved
  when nothing changed, and one Real-mode test proved nothing. Fixed with
  tests: a landing counts only after climbing 2 m, a crash retries the same
  lesson on the pad after the respawn, the bar's width is set in place, saves
  happen only for new passes, and crash and dropped-crate tests replace the
  weak one. Its notes (only the crate counts in lesson 4, the hold line once,
  car models reused and not freed twice) are done too; the reviewer
  confirmed. Its last small note (Stop during the 3 s crash wait) is fixed
  in HELI-FINISH.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`
  (PowerShell): 146 passed, 0 failed, 0 not run in 911.35 s.
  `npm run build`: passed in 917 ms.

## Changed assertions

- `tools/test-heli-mode.mjs` and `tools/test-heli-jobs.mjs`: their test
  pilots now start with the four lessons done (`TRAINED`), because carrying
  cars, the dispatch board and the pump after the free tank now open with
  the lessons. No check was removed or loosened; the new pilot's path is
  covered in `tools/test-heli-lessons.mjs`. The headless flight's
  fingerprint still matches on two runs.

## Race fingerprints

No race code changed.

## Sound cue

The lessons use the instructor lines HELI-RADIO recorded (opening,
starts, hold, drift, swing, passes, retry).

## Removed

Nothing was replaced.
