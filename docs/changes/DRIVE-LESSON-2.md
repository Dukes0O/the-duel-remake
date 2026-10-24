# DRIVE-LESSON-2: the racing line (rules, instructor, cones, proof)

Lesson 2 of `docs/DRIVING_LESSONS.md` section 12.2, in `src/lessons/drive-lessons.js`
beside lesson 1, with its own test `tools/test-drive-lesson-2.mjs`. Rules and the
instructor only: the board, panel, drawing, save and radio recordings are the
later cards (DRIVE-LESSONS-VIEW-2, -SAVE-2, -LINES-2), and nothing in the game
starts this lesson yet. Lesson 1's tests are unchanged and pass.

## What was built

- **Rows** (`DRIVE_LINE_ROWS`): Tremblant Woods, Fir Esses 1 and 2; Harbour Lights,
  Old Town Esses 1 to 4. The start gate is 150 m before the first corner; the
  rolling start is the speed the course's own racing-line profile allows there, at
  the instructor's pace (145 and 152 mph into Fir Esses, 92 and 97 mph into Old
  Town, Casual and Pro).
- **The instructor's line**: outside edge at the gate, level on the outside edge
  until a short lead before the first turn-in (40 m on Fir Esses, 20 m on Old
  Town, a per-row number), then the least-curvature S (two equal arcs, "parabolic"
  ease) through an apex cone 1.0 m in from the inside edge at each corner (the
  track script's own apex point) to an exit cone 1.5 m in from the outside edge
  after the last (the same distance past the corner's end as its last apex is
  before it). Steered with lesson 1's smooth-line steering (`instructorControls`).
- **Speed plan** from the tyre helper at 92% (Casual) and 97% (Pro), as lesson 1's,
  with two changes for the esses (lesson 1's numbers are untouched): the corner
  speed is held only while the line is still curving at least half as hard as its
  tightest point (`holdMode: 'curved'`), and the grip held back is 15% instead of
  4% (`lineYawMargin` .85), because linked corners leave the steering less spare
  grip.
- **Cones and markers**: an apex cone per corner and the exit cone (the 2 m check
  is between neighbouring cones' sideways positions); markers every 10 m down the
  middle of the road from the gate to the exit cone (30 and 38 of them).
- **The `line` lesson in `createDriveLesson` / `stepDriveLesson`**: try 1 (the
  middle) counts however it ends; try 2 passes with every apex cone touched, the
  exit cone passed on the outside half and screech under 0.3 s in total; then
  three in a row, then pass. Radio ids are `drive.radio.line.*` where the lessons
  document has them and lesson 1's challenge and coaching lines otherwise:
  `middle.start/result`, `right.start/pass`, `challenge.start`, `pass`,
  `coach.apex` (missed an apex cone), `coach.early` (ran out of road before the
  apex cones), `corner.coach.exit` and `corner.coach.screech`, `corner.challenge.one/two/reset`.
- `buildInstructorRun({lessonId: 'line'})` runs the instructor natively and
  counts every cone with the lesson's own counter; without `lessonId` it is lesson 1's, unchanged.

## The proof (docs 12.2: the middle of the road is at least 0.3 s slower)

A scripted driver on the middle line at the most speed that line allows (100% of its
tyre-limited plan), started from the instructor's own start pose, against the
instructor, measured on the lesson's own gate-to-gate clock, native, identical at
30, 60 and 144 FPS. **Both rows pass**:

| Row | Instructor | Middle at 100% | Middle loses |
| --- | --- | --- | --- |
| Fir Esses, Casual | 7.26 s | 8.14 s | 0.88 s |
| Fir Esses, Pro | 6.92 s | 8.12 s | 1.20 s |
| Old Town Esses, Casual | 10.75 s | 13.45 s | 2.70 s |
| Old Town Esses, Pro | 10.35 s | 13.40 s | 3.04 s |

(The first version of the line, with no entry lead, was *slower* than the middle on
all four: hugging the inside edge from the gate made the first corner tighter than
the road. The entry lead is what makes the racing line real.)

Also checked, native, every row, both paces, at 30, 60 and 144 FPS: the instructor
repeats exactly, counts every cone and passes its own three rules; the middle try
finishes and plays `middle.result`; the right try passes all three rules; two
100% drivers beat the instructor (by 0.35 s, 0.30 s, 1.07 s, 0.49 s on
Fir Casual, Fir Pro, Old Town Casual, Old Town Pro), a slow try resets the streak,
three in a row pass.

## Checks (Linux cloud)

- `tools/test-drive-lesson-2.mjs`: 15 of 15. `tools/test-drive-lessons.mjs` (lesson 1): 37 of 37, unchanged.
- Lane tier and build: see the end of this note.
- Not run here: anything needing a browser or the Windows-only suites (none is touched by this card).

## Removed

Nothing.
