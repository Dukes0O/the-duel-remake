# DRIVE-LESSON-4: snow (rules, instructors, cones, dry board, ice, winter run, proof)

Lesson 4 of `docs/DRIVING_LESSONS.md` section 12.4, in `src/lessons/drive-lessons.js`
beside lessons 1 and 2, with its own test `tools/test-drive-lesson-4.mjs`. Rules and
instructors only: the board, panel, drawing, save and radio recordings are later cards,
and nothing in the game starts this lesson yet. Lessons 1 and 2 tests are unchanged and pass.
Lesson 3 (gears) is skipped, as asked.

## What was built

- **Row** (`DRIVE_SNOW_ROWS`): Tremblant Snow (`tremblant-snow`), Beaver Hairpin, start gate
  150 m before the Beaver Kink (the piece before the hairpin), moved back along the road
  until there are 3 s of road before the first braking point (Claude's answer, 24 October).
  Gate 1498 m, rolling start 36 mph (Casual) and 38 mph (Pro): 14.2 s and 13.4 s of road
  before the first braking point.
- **Surface from the real road**: ice stretches are read from `duel._drivingSurface` under the
  middle of the road (`iceZonesOf`): one patch, 1739 to 1788 m, on the spur before the hairpin.
- **Two instructors, same code as lesson 1's** (`snowPlanFor`, on the tyre helper's speed plan):
  summer tyres for the lesson, winter tyres for the last run. Both drive the lesson 1
  smooth-line steering through the three cones. Casual 92% pace, Pro 97%.
- **Cones**: the snow cone (brake here) at 1726 m, the inside cone at the hairpin, an exit cone;
  the **dry board** is where the instructor would brake on a dry road (1800 m, past the ice):
  `dryBrakeS` from a plan on a copy of the road with full grip.
- **Ice rule**: the instructor finishes its braking 6 m before the ice (`iceClearM`) and never
  brakes on it (0.00 in both runs, the lesson allows under 0.20).
- **The `snow` lesson in `createDriveLesson` / `stepDriveLesson`**: try 1 (the dry board) counts
  however it ends and its result line is spoken only if the tyres screeched for 0.5 s or the car
  left the road; try 2 passes with four rules (brake within 15 m of the snow cone, ice brake
  under 20%, inside cone touched, screech under 0.3 s); then three in a row; then one run on
  winter tyres against the winter instructor, which passes however it ends (`queued:
  ['drive.radio.snow.pass']` rides on the winter result so the result line is not lost).
  Radio ids: `drive.radio.snow.{late.start, late.result, right.start, right.pass, coach.brake,
  coach.ice, coach.turn, winter.start, winter.result, pass}` and lesson 1's `corner.*` coaching and challenge lines.
- `buildInstructorRun({lessonId: 'snow'})` builds the winter instructor first and attaches it as
  `instructor.winter`; without `lessonId` it is lesson 1's, unchanged. The helper gained options
  used only here (`lockMargin`, `noBrakeZones`, `brakeByTraction`, `cruiseMph`); lessons 1 and 2 pass `undefined`
  and get the previous behaviour.

## Numbers (native, Falcone F42, identical at 30, 60 and 144 FPS)

| | Casual | Pro |
| --- | --- | --- |
| Summer instructor | 31.45 s | 29.95 s |
| Winter instructor | 29.53 s | 28.08 s |
| Gate, rolling start | 1498 m, 36 mph | 1498 m, 38 mph |
| Snow cone, dry board | 1726 m, 1800 m | 1725 m, 1799 m |
| Brake on the ice | 0.00 | 0.00 |

## The proofs

- **Winter tyres make a faster instructor** (docs 12.4): 1.9 s faster, Casual and Pro.
- **The dry board is too late**: a scripted driver follows the instructor to the snow cone, then waits
  for the dry board and brakes there; native, at every FPS, it screeches at least 0.5 s or ends on a wall or off the road.
- **The right try passes all four rules** with a scripted driver braking hard at the snow cone, before the ice.
- A challenge-pace driver beats the summer instructor, a slow one resets the streak, three in a row then
  the winter run passes the lesson; results are identical at 30, 60 and 144 FPS.

## Checks (Linux cloud)

- `tools/test-drive-lesson-4.mjs` 12 of 12; `tools/test-drive-lessons.mjs` and `tools/test-drive-lesson-2.mjs` unchanged and passing (53).
- Lane tier and build: see the end of this note.
- Not run here: browser checks and the Windows-only suites (none is touched by this card).

## Removed

Nothing.
