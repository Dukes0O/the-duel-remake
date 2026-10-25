# DRIVE-LESSON-3: the gearbox (rules, instructor, cones, proof)

Lesson 3 of `docs/DRIVING_LESSONS.md` section 12.3, in `src/lessons/drive-lessons.js` beside lessons 1, 2 and 4, with its own test
`tools/test-drive-lesson-3.mjs`. Rules and instructors only: the board, panel, shift lights, drawing, save and radio recordings are later cards
(DRIVE-LESSONS-VIEW-2), and nothing in the game starts this lesson yet. It runs on the engine curve (ENGINE-CURVE, switch `engine-curve`); the host
shows "Opens later" while that switch is off. Lessons 1, 2 and 4 tests are unchanged and pass. My six picks were confirmed (see the card's "Claude answers").

## What was built

- **Rows** (`DRIVE_GEAR_ROWS`): Panorama Ridge from the start of the Mountain Straight (539 m) into The Cutting; Tremblant Woods 400 m before Beaver Hairpin
  (1409 m). Both start at 30 mph in 2nd and finish 60 m past lesson 1's exit cone (1845 m, 2000 m). Both stretches have a bend before the corner
  (Griffin Bend, Beaver Kink), which lesson 1 also runs through.
- **The lesson in `createDriveLesson` / `stepDriveLesson` (`'gears'`)**: try 1 (change up at the green mark) counts however it ends and says `gears.early.result`
  only when it finished at least 0.3 s slower than the instructor; try 2 passes with four rules: every change up on the lights (90% revs or more, read from the
  revs on the dial the step before), under 0.5 s on the limiter in all (revs at 100% or more with the throttle down), no higher a gear than the instructor at
  the apex cone and at the exit cone his gear or the next one up, screech under 0.3 s; then three in a row against the instructor's time. The first failed rule picks the coach line.
  The view needs `gear` and `revs`. Radio ids: `drive.radio.gears.{early.start, early.result, right.start, coach.limiter, coach.down, right.pass, challenge.start, pass}`
  and lesson 1's `corner.coach.screech` and challenge lines.
- **The instructor** (`gearsPlanFor`, `gearsControls`, `buildInstructorRun({lessonId: 'gears'})`): lesson 1's line and corner from the new gate, a speed plan that lets the
  engine's pull limit the straight (`GEAR_LESSON.accelShare`), firm braking for every bend, changes up at 96% revs and changes down, while braking and one gear at a time,
  to the gear that puts the slowest speed in the next 150 m nearest 75% revs (never past 92%). He passes his own four rules (the build throws if not) and clears every cone by 0.5 m past the tip distance.
  His gears at the apex and exit cones are recorded. The run is manual and engine damage is off on the scratch Duel (`diff` overridden there), on the engine curve.
- Small shared changes, byte-neutral for the other lessons: `buildLessonPlan` takes an `accelShare` option (default unchanged), `instructorControls` a `brakeInTurns` option
  (default off), `finishInstructorTrace` keeps a whole `gear` on the finish pose (no other lesson has one).

## The proof (Casual and Pro, both rows, 60 FPS; seconds against the instructor)

- Changing up at the green mark: Panorama +2.69 (Casual), +2.70 (Pro); Tremblant +1.44, +1.37. Card: at least 0.3.
- One gear too high at the corner: +0.08, +0.03, +0.10, +0.05 (slower, as the card asks; small, since the run ends 60 m past the exit cone).
- Never changing down: +0.37, +0.30, +0.44, +0.37, 4th or 5th gear at the apex on Panorama, 3rd on Tremblant.
- The right try repeats the instructor within 0.05 s and passes every rule; a full-pace driver beats him three times; scoring repeats at 30, 60 and 144 FPS.
- Instructor times: Panorama 28.72 (Casual) and 28.16 (Pro); Tremblant 20.86 and 20.30. A test also shows the lesson needs the curve: with the old pull early shifting is not slower.

## Checks (Linux cloud)

- `tools/test-drive-lesson-3.mjs`: 20 of 20 (pure rules, all four instructors and the proof natively).
- Lessons 1, 2, 4, the helipad, lines and save tests unchanged; lane tier and build: see below.

## Removed

Nothing.
