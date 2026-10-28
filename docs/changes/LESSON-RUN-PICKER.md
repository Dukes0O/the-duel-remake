# LESSON-RUN-PICKER

## Why

Kyle played driving lesson 1 (Braking, Panorama Ridge) on 28 October and said
the card under the rear-view mirror offered nothing and distracted from the
lesson, and that "How this lesson works" is not needed because the opening
screen already says it. The opening screen is where he wants to pick run 1, 2,
3 or 4, and to pick again after each run finishes.

## Decision before code (Claude, 28 October)

- During a run the step strip, the one-line rule, "How this lesson works",
  "Leave lesson / Esc" and "Skip / Enter" are gone. The coaching line (Watch me's
  caption), Brian's spoken and captioned lines, the corner lights, target box
  and gap stay. One quiet line in the bottom-left corner says
  "Esc: back to the lesson menu".
- The opening screen (the lesson briefing) replaces its single "Start Watch me"
  and its text list of the four steps with four run buttons, "1 Watch me" to
  "4 Beat me", each with its existing one-line description. Any run can be
  started at any time. A mark shows what this visit has done ("Done" for the
  two practice runs, "Passed, best 0.42 s faster" and ", Gold" for the scored
  ones). The first run not done is highlighted; when all four are done it is
  Your turn; a retake counts Watch me and Follow me as done, so it starts at
  Your turn as before.
- Keys: 1 to 4 start that run, Enter starts the highlighted one. They work on
  the opening screen and on the result card, never during a run.
- Esc during a run drops it unscored and returns to the opening screen, with
  the car back at the start line. Esc on the opening screen or on a result
  card leaves the lesson, as Esc always did.
- When a run finishes, the result card shows as before. Its step strip, "Start
  next" and "again" buttons are replaced by the same four run buttons (less new
  code than folding the result into the opening screen, and the run buttons are
  one click or key away). "Leave lesson" stays.
- A passed lesson no longer locks: all four runs can be picked again after the
  pass. Nothing is paid twice. A better margin in the same visit is saved
  (`finishDriveLesson` already keeps the best margin and the reward flag).
- Same for lessons 1 to 4 on every road, and for the helipad entry, since all
  use the one screen code.

## What changed

- `src/lessons/drive-lessons.js`: each lesson keeps `runs` (a finished practice
  run, or a passed scored run with its best margin) and `retake`;
  `suggestedDriveLessonRun()` names the highlighted run; a passed lesson can be
  run again (`chooseDriveLessonStep` and `stepDriveLesson` no longer stop at
  `done`). No scoring, rule or physics change.
- `src/game.js`: `resetDriveLessonAttempt` no longer refuses a passed lesson.
- `src/app.js`: `nextLessonAttempt` (Enter, R) now starts the highlighted run
  and does nothing during a run; `chooseLessonStep` clears the old "saved" note;
  new `lessonEscape` (Esc) and `lessonRunKey` (keys 1 to 4); a second pass with
  a better margin is saved.
- `src/lessons/drive-lesson-ui.js` and `.css`: the run buttons
  (`runPicker`), the stripped-down run panel, the Esc hint.
- Tests and browser scenarios, see below.
- `docs/DRIVING_LESSONS.md` section 14.7 describes the new screen.

## Removed

- The step strip (`stepStrip`), "Watch me again / Follow me again / Same step
  again" (`againButtons`), "Start <next>" (`nextButton`, `canNext`), the
  "How this lesson works" panel and its state (`driveLessonHelp`, the
  `reopened` briefing, `help` and `close-help` actions, `onHelp`, `onCloseHelp`),
  the Skip button and its action, the "four steps" text list on the opening
  screen (`drive-lesson-brief-steps`) and the run panel's rule line, Leave and
  Skip buttons. Their styles are gone from `drive-lesson-ui.css`. Nothing is
  hidden; the code is deleted.

## Changed assertions (reviewed by Claude's design above)

Every one follows from a removed control or the lock coming off; none loosens a
check on scoring, saving or ownership.

- `test-drive-lesson-run.mjs`, native App: "Start Watch me dismisses the
  briefing" now reads "Enter on the opening screen starts the highlighted run".
  The 240-tick Watch replay is followed by the run to its finish (there is no
  Skip), then Follow me starts. After the pass, `nextLessonAttempt()` was
  expected to be false; it is now true (a passed lesson can be run again), with
  new checks that a second pass pays nothing more, that the keys 1 and 4 work,
  and that Esc goes to the opening screen and then out of the lesson.
- `test-drive-lesson-run.mjs`, panel text: `driveLessonPanelMarkup` was expected
  to hold "One clean run faster". That rule line moved to the run buttons, so
  the same text is now checked in the result markup, and the panel is checked to
  have no buttons, no step strip and the Esc hint.
- `test-drive-lesson-run.mjs`, Enter binding: the click on `data-drive-action=next`
  no longer exists; Enter is still checked (opening screen and result card
  start the run, a run in progress and another player's lesson do nothing).
- `test-drive-lessons.mjs`: "any step can be chosen again ... until the lesson
  is passed" now expects a passed lesson to accept a new step (it expected
  `false`).
- `test-lessons-v2-view.mjs`: "Start Watch me" and "Start Follow me" become
  "1 Watch me" and "2 Follow me" buttons; "Enter skips the whole Watch step"
  becomes "Enter during Watch me does nothing".
- Scenarios `drive-lesson-run`, `drive-lessons-view-2`, `lessons-v2-view`: the
  Start, Skip, step strip and help clicks become run-button clicks, Esc and the
  keys 1 to 4; the result card must offer all four run buttons and none of
  the old buttons. The 100 ms click checks now click the run button on the
  opening screen (the run screen has no buttons to click).

New tests: marks and the highlighted run (`test-drive-lessons.mjs`, the opening
screen and result markup in `test-drive-lesson-run.mjs`).

## Checks

- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`, PowerShell):
  42 of 43 suites passed. The one not finished was
  `test-lesson-instructor-any-car.mjs`, which builds the instructor for every car
  on every lesson and course; it had used over 33 minutes of processor time when
  it was stopped (rule 4). It only builds the instructor's own run, which this
  card does not touch. A sample by hand passed: lesson 1 on Panorama Ridge,
  lesson 2 on Tremblant Woods and lesson 4 on Tremblant Snow, Falcone F42, Casual
  and Pro (6 of 6). That suite is slow enough to deserve its own small card.
- `npm run build`: passes.
- Every lesson suite by hand: `test-drive-lesson-2`, `-3`, `-4`, `-helipad`,
  `-lines`, `-run`, `-save`, `test-drive-lessons`, `test-drive-lessons-view-2`,
  `test-lessons-v2-view`, `test-heli-lesson-core`, `test-heli-lessons`,
  `test-lab-lesson*` all pass.
- Browser scenarios (`run-browser-scenarios.mjs`, `--jobs 2`):
  `drive-lesson-run`, `drive-lessons-view-2` and `lessons-v2-view` all PASS,
  0 warnings, 0 errors. The run screens were checked at 1280 by 720: the four
  run buttons sit under the lesson title on the opening screen and under the
  time line on the result card, so they show without scrolling; the run screen
  has no strip, no buttons and only the quiet Esc line in the bottom-left.
  One first run of `drive-lessons-view-2` failed because its fixed 1.2 s wait
  left the car at 0.2999 s on a busy laptop; the wait is now "until the run has
  lasted 0.3 s" (same check, no looser) in that scenario and in `drive-lesson-run`.
- No frame check: the change adds no scene work.

## Claude's change (28 October 2026)

The highlighted run now moves forward from the run just played: after Follow me it is Your turn, even when Watch me was skipped; it wraps to the first run left only when nothing is open ahead. `suggestedDriveLessonRun` in `src/lessons/drive-lessons.js`. Changed assertions in `tools/scenarios/drive-lesson-run.mjs`: the result card after Follow me highlights Your turn (was Watch me), and Enter on the opening screen then starts Your turn (was Watch me); same strength, new design. Two new cases in `tools/test-drive-lesson-run.mjs`. drive-lesson-run and lessons-v2-view pass; test-drive-lesson-run 21/21.

Lane tier note (Claude): `tools/test-lesson-instructor-any-car.mjs` was stopped after more than an hour (rule 4). It tests only `buildInstructorRun`, which this card does not change (the diff touches `createDriveLesson`, `finishAttempt`, `stepDriveLesson` and `suggestedDriveLessonRun`), so its pass in the 28 October full tier on 06d5505e still covers it. Its run time is card QA-INSTRUCTOR-ANY-CAR-SLOW.

## Claude's review (28 October 2026, night)

Approved (independent code review, rule 17; written review of changed assertions, rule 18). The step strip, help panel and Skip are removed, not hidden. Esc in a run returns to the opening screen with the car reset (resetDriveLessonAttempt clears the impact state); Esc on a menu leaves. Keys 1 to 4 only act on the opening screen or result card. Saving: a better margin from a later pass calls finishDriveLesson again, which records the best margin; grantDriveLessonReward returns early once rewarded, so no credits are paid twice. Changed assertions follow Kyle's design (runs any time, no Skip, highlight moves forward); none loosen scoring, saving or ownership. Look checked on three pictures.
