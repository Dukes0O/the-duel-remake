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

## Cone clearance (Claude's answer, 24 October): the instructor never clips a cone

A cone tips when the car's centre line passes within 0.8 m (`TIP_DISTANCE_M`) and counts
when it passes within 2.5 m. Every instructor run now clears every cone by at least
0.5 m past the tip distance: nearest approach 1.3 m or more (`LESSON_LINE.minClearM`),
still inside the 2.5 m that counts the cone. `buildInstructorRun` throws if a run is
closer (and now reports the nearest distances when a cone is missed), and each of the
three native instructor tests asserts it for every cone, both paces, and for snow also
the winter run. Before this the instructors drove straight through the cones (0.0 to 1.0 m).

How: the instructor's line is aimed off each cone towards the middle of the road
(`coneClearM` 1.4 m for outside cones, `apexClearM` 0.8 m for apex cones; snow's winter
run `winterApexClearM` 1.3 m because the winter car holds the apex line better), since
the car at the apex ends 0.3 to 1.4 m wide of the line it aims for. The cones stay where
they were. This applies to lessons 1, 2 and 4; lesson 2 shifts only its exit waypoint
(its entry has no cone) so its gate keeps 3 s of road. Nearest approach, cone 1 / apex
cones / exit cone, metres: Panorama Ridge 1.40 / 2.05 / 1.70 (Casual), 1.40 / 2.15 / 1.74
(Pro); Tremblant Woods 1.40 / 1.58 / 1.56, 1.41 / 1.66 / 1.58; Fir Esses 1.93 / 2.29 / 2.18,
1.99 / 2.32 / 1.83; Old Town 1.99 / 1.81 / 1.82 / 1.85 / 2.09, 2.05 / 1.91 / 1.85 / 1.90 / 2.13;
snow summer 1.44 / 1.89 / 1.48 (Casual), 1.45 / 2.24 / 1.49 (Pro), snow winter 1.44 / 1.56 /
1.48, 1.45 / 1.92 / 1.49.

Re-recorded numbers (a deliberate change to the instructors' lines; no assertion was
loosened and no test needed editing beyond the new clearance check): instructor times,
Casual / Pro: Panorama Ridge 9.90 s / 9.58 s, Tremblant Woods corner 16.05 s / 15.49 s,
Fir Esses 7.88 s / 7.72 s (was 8.03 / 7.76; gates 585 m and 575 m, was 585 and 580, with
3.01 s and 3.07 s of road), Old Town 10.98 s / 10.58 s (was 10.75 / 10.35; gate 1301 m,
3.36 s and 3.16 s of road).

## Numbers (native, Falcone F42, identical at 30, 60 and 144 FPS)

| | Casual | Pro |
| --- | --- | --- |
| Summer instructor | 31.86 s | 30.32 s |
| Winter instructor | 29.78 s | 28.31 s |
| Gate, rolling start | 1498 m, 36 mph | 1498 m, 38 mph |
| Snow cone, dry board | 1726 m, 1800 m | 1725 m, 1799 m |
| Brake on the ice | 0.00 | 0.00 |

## The proofs

- **Winter tyres make a faster instructor** (docs 12.4): 2.1 s faster Casual, 2.0 s Pro.
- **The dry board is too late**: a scripted driver follows the instructor to the snow cone, then waits
  for the dry board and brakes there; native, at every FPS, it screeches at least 0.5 s or ends on a wall or off the road.
- **The right try passes all four rules** with a scripted driver braking hard at the snow cone, before the ice.
- A challenge-pace driver beats the summer instructor, a slow one resets the streak, three in a row then
  the winter run passes the lesson; results are identical at 30, 60 and 144 FPS.

## Checks (Linux cloud)

- `tools/test-drive-lesson-4.mjs` 12 of 12; `tools/test-drive-lessons.mjs` and `tools/test-drive-lesson-2.mjs` pass (53), with the one clearance assertion added to each native instructor test.
- Run once on this branch after merging current `integration/wasteland` (84768cb2), lane tier
  `--changed --jobs 8 --keep-going`: 231 of 237 suites pass, including lessons 1, 2 and 4 and every replay
  and world-signature guard. The six failures are the laptop-only suites: `test-course-kit`,
  `test-earned-cars-ui`, `test-medals`, `test-full-check`, `test-salt-flats`, `test-salt-flats-art`.
  `npm run build` passes.
- Not run here: browser checks and the Windows-only suites (none is touched by this card).

## Removed

Nothing.
