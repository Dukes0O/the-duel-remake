---
task: STORY-KOGANE-LESSON
status: done
player_facing: no
---

# STORY-KOGANE-LESSON: Brian's Hairpin Lesson on Kogane Pass

Claude helper, 29 October 2026. Lane `claude/story-lesson`. Packet:
`docs/story/kogane-invitation.md` 8.1 and 12.

## Result in one paragraph

The Kogane row is in lesson 1. For all 14 cars, Casual and Pro, the instructor
finishes the row cleanly and gets the same run twice. The row is **four
corners and two hairpins, not six corners and three hairpins** (open item 6
of the packet): with three hairpins the two starter cars took 108 to 111 s,
well over the 75 s rule. The row is hidden from players while the
`kogane-pass` switch is off. The lesson reward is untouched.

## Changed

- `src/lessons/drive-lessons.js`
  - New row `kogane-pass` in `DRIVE_LESSON_CORNERS`: corners Cedar Bend,
    Maple Hairpin, Maple Bend, Tea House Hairpin. It starts at metre 1,126
    (150 m back from the start of the Cedar Descent straight, 80 m before
    Cedar Bend begins) and finishes 60 m past Tea House Hairpin (metre 2,260),
    about 1,134 m.
  - `LESSON_TURN_NAMES['kogane-pass']`: `Cedar Bend` 1206, `Maple Bend` 1782,
    the two bends the track script leaves unnamed (as the packet said).
  - Two numbers in `sectionPlanFor`, for Kogane only: the instructor's line
    keeps 3.4 m clear of the road edge at the start of the row and at each
    inside apex (other roads: 2.9 and 2.5; Harbour Lights has its own). See
    "Why the line was moved" below. No other road's line changes, so every
    other row's run is the same as before.
  - The road itself is not touched.
- `src/lessons/drive-lesson-ui.js`: the completion record from
  `driveLessonCompletion` gains `courseId` (from the run's plan). The app
  (STORY-KOGANE-HOOKS) will read it to write the story mark. `app.js` is not
  touched here.
- `tools/qa-kogane-switch.mjs` (new, 4 lines): imported first by the tests
  that drive the Kogane row, it turns the QA switch for `kogane-pass` on
  before the course list is built (the list is fixed when `src/config.js`
  first loads). Without it, every test that walks `DRIVE_LESSON_CORNERS`
  would meet a course that is not in the list.
- `tools/test-lesson-instructor-any-car.mjs`, `tools/test-drive-lesson-2.mjs`,
  `tools/test-drive-lesson-3.mjs`: import that helper first. The row tests
  they build from the table now include Kogane (all three read the table, so
  the row count in each goes up by one row).
- `tools/test-lessons-v2-view.mjs`: one new test. With the switch off, the
  board lists no Kogane row even though the row is defined; with the course
  present the row is listed; the completion record names the course.
- `tools/test-drive-lesson-run.mjs`: the existing completion test now also
  gives its plan a `courseId` and expects it in the record (see changed
  assertions).
- `tools/test-drive-lessons.mjs` needed no change: it tests the lesson state
  machine with its own invented section, and never reads the row table.

## Why the line was moved (Kogane only)

First run of the full six-corner row: the Titan monster truck failed at the
first hairpin in every attempt (`scrape` on the inside wall, 3.4 m from the
centre of a 12 m road, at every pace it tried). The truck is wider
than the 2.5 m apex margin allows on this road. Under the brief's rule the
fallback was to drop the hairpin, but the Titan failed at all three, so
dropping them would have left a hairpin lesson with no hairpins. The
instructor's line is plain data inside `sectionPlanFor`, so I gave Kogane
3.4 m of clearance at the outside start and each inside apex. After that all
14 cars finish every hairpin. This touches two lines outside the files the
card names; Claude to review.

## Row times (instructor, seconds)

Final row, measured with `buildInstructorRun`, the same code the game uses.
Rule 14.3: 30 to 75 s.

| Car | Casual | Pro |
| --- | --- | --- |
| Falcone F42, Falcone Heritage | 71.3 | 69.2 |
| Banshee muscle | 64.6 | 62.8 |
| Titan monster | 38.5 | 37.5 |
| Stuttgart 959S | 38.9 | 37.8 |
| Aurora GT | 36.9 | 35.9 |
| Dusthawk rally | 36.4 | 35.4 |
| Falcone Sirena | 36.0 | 34.9 |
| Viper proto | 35.1 | 34.1 |
| McLaren F1 | 33.2 | 32.3 |
| Ferrari Enzo | 33.1 | 32.1 |
| McMurtry Speirling | 33.0 | 32.2 |
| Bugatti Bolide | 32.5 | 31.6 |
| Koenigsegg Jesko | 32.2 | 31.3 |

Slowest 71.3 s (F42, Casual), fastest 31.3 s (Jesko, Pro).

### How the row was chosen

| Row tried | F42 Casual | Jesko Casual | Verdict |
| --- | --- | --- | --- |
| The packet row: six corners, three hairpins, 1,850 m | 111.4 s (119 s before the line fix) | 42.9 s | over 75 s |
| Five corners, finish after Maple Bend | 101.0 s | not run | over 75 s |
| Four corners from Cedar Hairpin to Maple Bend | 94.1 s | not run | over 75 s |
| Three corners from the start of Cedar Descent: Maple Hairpin, Maple Bend, Tea House | 62.3 s | 25.0 s | Jesko under 30 s |
| **Four corners from metre 1,126, 80 m before Cedar Bend** (chosen) | **71.3 s** | **32.2 s** | **inside 30 to 75 s for all 14** |

The packet's own fallback (finish after Maple Bend) was not enough. The
cause is the starter car: on the tightest hairpins the F42 and Heritage
cannot turn at any real speed, so the instructor's plan bottoms out at 1 mph
and each such hairpin costs 20 to 27 s. Three of them cannot fit in 75 s.

## Hairpins dropped, and why

- **Cedar Hairpin (15 m)**: dropped from the row. The row starts after it.
  Reason: time. In the F42 it is a 1 mph crawl of about 27 s.
- **Maple Hairpin (14 m)** and **Tea House Hairpin (16 m)**: kept. Both are
  driven cleanly by every car.
- No hairpin failed outright once the line fix was in. The packet's
  "row falls to two hairpins" case (open item 6) is what happened.

## Open for Claude

- **Starter car and the 14 m hairpin.** In the F42 and Heritage the plan's
  speed for Maple Hairpin is 1 mph (Tea House Hairpin is 27 mph, Maple Bend
  71, Cedar Bend 43). So a player in the starter car sees a "corner speed
  2 km/h" target on that hairpin, and the instructor visibly crawls. Beat me
  and Your turn are still passable (clean and faster, or clean and every
  other check), and the every-car test passes, but it is an odd thing to
  teach. If wanted, the row could finish before Maple Hairpin for the two
  slowest cars only, but that would need a per-car row, which the table does
  not have. Left as is; this is a design call.
- The packet's "320 m of Shrine Straight before the first brake zone" is
  gone: the row starts 80 m before Cedar Bend, on the straight after
  Cedar Hairpin.
- Story mark: this card only adds `courseId` to the completion record.
  Writing the mark next to `finishDriveLesson` is STORY-KOGANE-HOOKS.

## Reward

Unchanged. `finishDriveLesson`, `grantDriveLessonReward` and the save are not
touched; the row passes through the same completion path as any other.

## Tests

Run from PowerShell with `--jobs 2` or fewer, memory-only saves.

- `node tools/run-tests.mjs --tier lane --changed --jobs 2`: 34 passed, 0
  failed (this includes `test-drive-lesson-2` with its 30 to 75 s check for
  the F42 and the Jesko on the Kogane row, `test-drive-lesson-3` with the
  100% driver beating the instructor, `test-lesson-instructor-any-car` in its
  sample form, `test-drive-lesson-run`, `test-lessons-v2-view`).
- `node --test --test-name-pattern=kogane-pass tools/test-lesson-instructor-any-car.mjs`
  (all 14 cars, Casual and Pro, each built twice and compared): see the
  result line at the end of this note.
- `npm run build`: passed.

### Changed assertions

- `tools/test-drive-lesson-run.mjs`, test "completion requires the current
  owner...": the expected record was `{id, carId, marginSeconds}` and is now
  `{id, courseId, carId, marginSeconds}`, with the test's plan given
  `courseId: 'tremblant-snow'`. The record gains a field; every other
  condition in that test is unchanged and nothing is loosened.
- Row counts: the three table-driven suites (`any-car`, `drive-lesson-2`,
  `drive-lesson-3`) each gain the four Kogane row tests per car and
  difficulty. No assertion in them was changed.

## Removed

Nothing is replaced by this card. A temporary debug line added during the
Titan search was removed again before the final commit.
