# LESSONS-MORE-ROADS

Second places to practise for the four driving lessons, on courses players
already have (Claude's decision of 28 October 2026, night). Design:
`docs/DRIVING_LESSONS.md` 14.13.

## Decision before code

The card asked for Braking and Racing line at Ardennes Forest, Snow at Summit
Run, and Gearbox only if a stretch suited it. Choices, with the reasons:

- **Braking, Ardennes Forest:** from the top of Kestrel Straight (1 km, the
  longest run-up on the course) through Les Combes, Combes Exit, Malmedy,
  Riverside, Woodland Left, Fagnes and Fagnes Exit. Les Combes is the hardest
  stop from high speed. Seven corners, none shared with another Braking row.
- **Racing line, Ardennes Forest:** Long Left, Fagnes, Fagnes Exit, Campus,
  Stavelot, Woodcutter and Whitewood, the longest flowing stretch. The card's
  first choice, Eau Rouge and Raidillon (Red Water, The Wall, Wall Crest), was
  built and measured and does not work: Wall Crest launches a car about 5 m
  into the air at 167 mph (the Jesko) and 2.7 m at 125 mph (the Falcone), and
  the line follower cannot steer in the air, so the Jesko leaves the road just
  after the crest (on Pro at every pace down to the floor; on Casual it only
  finishes at the floor pace, with no full-pace run to measure room against). A speed rule for crests
  would fix it; that is a separate card. La Fontaine, the hairpin before it,
  gives a 1 mph target (the line is tighter than the car can turn).
- **Snow, Summit Run:** the three snow hairpins (Glacier Hairpin, Devil's
  Elbow, Last Breath) cannot be driven by every car. They are 15 to 16 m
  radius on a 12 m road, and on snow the Falcone's smallest turn at the
  instructor's safety margin is about 23 m. Even a line hugging the outside
  edge (about 21 m) leaves it stuck at the edge, and the plan asks for 1 mph.
  The row is instead the three long bends after the Glacier Hairpin
  (Whiteout Bend, Gallery Bend 1 and 2) with the 20 m ice patch between the
  first two. It is real snow, with the winter-tyre comparison, but it has no
  hairpin. If Kyle wants a hairpin on snow, the lesson needs a rule for
  turns tighter than the car can make (stop and reverse, or a wide run-off),
  which is a design change, not a row.
- **Gearbox, Summit Run:** fits well. Pine Switchbacks (a 400 m climb) into
  Picnic Hairpin, the Picnic Bend, Engineer's Hairpin and Engineer Bend. The
  asphalt hairpins are drivable (40 km/h target, Casual).

The track script leaves several Summit bends without a name, and lesson rows
are written by piece name. `LESSON_TURN_NAMES` in `drive-lessons.js` gives a
lesson name to a bend by the metre it begins (Picnic Bend 4462, Engineer Bend
5380, Glacier Exit 8754, Whiteout Bend 9439, Gallery Bend 1 10570, Gallery
Bend 2 11170). `sectionPlanFor` looks a name up in the course's pieces first
and in this list second. The course data is untouched, so world signatures
and replays are unchanged. Glacier Exit is listed but no row uses it yet.

No per-course value was added to `sectionPlanFor` (outsideClear, apexClear,
yawMargin, lockMargin): both courses drive cleanly on the defaults.

## What changed

- `src/lessons/drive-lessons.js`: one new row in each of `DRIVE_LESSON_CORNERS`,
  `DRIVE_LINE_ROWS`, `DRIVE_SNOW_ROWS` and `DRIVE_GEAR_ROWS`; the
  `LESSON_TURN_NAMES` table and its lookup in `sectionPlanFor`.
- `src/lessons/drive-lesson-ui.js`: the board label for the Summit gearbox
  row ("Pine Switchbacks into Picnic Hairpin"). The board and the app already
  list every row of each table, so the new courses appear as a choice with no
  other change. As today, the board does not check that the course is owned;
  the lessons are free on every course.
- `tools/test-drive-lesson-4.mjs`: the snow test ran only Tremblant Snow by
  name; it now runs every row of `DRIVE_SNOW_ROWS`.
- `docs/DRIVING_LESSONS.md`: new rows in the 14.3 table and section 14.13.

## Times and room per car

All 14 cars, Casual and Pro: every run is clean and repeats exactly, and the
instructor's time is at least 7% (Casual) or 4% (Pro) slower than a clean
full-pace run in the same car (14.12). Every row has a full-pace reference.
Pace is in brackets, then the room to beat him in seconds.

**1 Braking, Ardennes Forest** (seconds, pace in brackets, room to beat him)

| Car | Casual | Pro |
| --- | --- | --- |
| aurora_gt | 58.7 (0.89, 3.9) | 56.9 (0.93, 2.4) |
| banshee_muscle | 61.5 (0.88, 4.5) | 59.2 (0.93, 2.4) |
| bugatti_bolide | 50.3 (0.88, 3.7) | 48.4 (0.93, 1.9) |
| dusthawk_rally | 59.8 (0.89, 4.1) | 58.0 (0.93, 2.5) |
| falcone_f42 | 64.4 (0.88, 4.7) | 62.0 (0.93, 2.6) |
| falcone_heritage | 64.4 (0.88, 4.7) | 62.0 (0.93, 2.6) |
| falcone_sirena | 57.0 (0.89, 3.9) | 55.2 (0.93, 2.4) |
| ferrari_enzo | 53.6 (0.89, 3.7) | 52.0 (0.93, 2.2) |
| koenigsegg_jesko | 49.6 (0.88, 3.4) | 48.1 (0.93, 1.9) |
| mclaren_f1 | 52.7 (0.89, 3.5) | 51.1 (0.93, 2.2) |
| mcmurtry_speirling | 53.9 (0.89, 3.7) | 52.2 (0.93, 2.3) |
| stuttgart_959s | 61.9 (0.89, 4.3) | 60.0 (0.93, 2.6) |
| titan_monster | 73.3 (0.91, 5.0) | 71.3 (0.94, 3.2) |
| viper_proto | 55.7 (0.88, 4.1) | 53.6 (0.93, 2.3) |

**2 Racing line, Ardennes Forest** (seconds, pace in brackets, room to beat him)

| Car | Casual | Pro |
| --- | --- | --- |
| aurora_gt | 51.1 (0.87, 3.6) | 49.5 (0.92, 2.0) |
| banshee_muscle | 52.4 (0.88, 3.7) | 50.6 (0.93, 2.0) |
| bugatti_bolide | 45.6 (0.87, 3.1) | 44.2 (0.92, 1.8) |
| dusthawk_rally | 52.2 (0.88, 3.6) | 50.8 (0.92, 2.3) |
| falcone_f42 | 54.3 (0.88, 3.7) | 52.9 (0.92, 2.3) |
| falcone_heritage | 54.3 (0.88, 3.7) | 52.9 (0.92, 2.3) |
| falcone_sirena | 50.0 (0.87, 3.4) | 48.5 (0.92, 1.9) |
| ferrari_enzo | 47.4 (0.88, 3.2) | 46.2 (0.92, 2.0) |
| koenigsegg_jesko | 45.3 (0.87, 3.1) | 43.9 (0.92, 1.8) |
| mclaren_f1 | 46.9 (0.87, 3.3) | 45.4 (0.92, 1.8) |
| mcmurtry_speirling | 47.9 (0.88, 3.2) | 46.6 (0.92, 2.0) |
| stuttgart_959s | 53.6 (0.87, 3.8) | 51.9 (0.92, 2.1) |
| titan_monster | 64.8 (0.91, 4.4) | 63.1 (0.94, 2.8) |
| viper_proto | 48.7 (0.87, 3.3) | 47.4 (0.91, 2.0) |

**3 Gearbox, Summit Run** (seconds, pace in brackets, room to beat him)

| Car | Casual | Pro |
| --- | --- | --- |
| aurora_gt | 41.6 (0.83, 2.8) | 40.5 (0.89, 1.7) |
| banshee_muscle | 42.3 (0.83, 2.8) | 41.2 (0.89, 1.7) |
| bugatti_bolide | 36.2 (0.83, 2.5) | 35.1 (0.90, 1.4) |
| dusthawk_rally | 40.7 (0.84, 2.7) | 39.6 (0.90, 1.5) |
| falcone_f42 | 45.2 (0.82, 3.1) | 43.9 (0.89, 1.8) |
| falcone_heritage | 45.2 (0.82, 3.1) | 43.9 (0.89, 1.8) |
| falcone_sirena | 40.3 (0.83, 2.7) | 39.1 (0.90, 1.5) |
| ferrari_enzo | 36.9 (0.83, 2.6) | 35.7 (0.90, 1.4) |
| koenigsegg_jesko | 35.6 (0.83, 2.5) | 34.5 (0.90, 1.4) |
| mclaren_f1 | 36.9 (0.83, 2.5) | 35.8 (0.90, 1.4) |
| mcmurtry_speirling | 36.0 (0.84, 2.5) | 35.0 (0.90, 1.4) |
| stuttgart_959s | 44.0 (0.83, 2.9) | 42.8 (0.89, 1.8) |
| titan_monster | 45.2 (0.89, 3.0) | 44.0 (0.93, 1.8) |
| viper_proto | 39.4 (0.83, 2.7) | 38.2 (0.90, 1.5) |

**4 Snow, Summit Run** (seconds, pace in brackets, room to beat him)

| Car | Casual | Pro |
| --- | --- | --- |
| aurora_gt | 46.8 (0.85, 3.3) | 45.2 (0.91, 1.7) |
| banshee_muscle | 47.7 (0.86, 3.2) | 46.4 (0.91, 1.9) |
| bugatti_bolide | 41.2 (0.83, 2.9) | 39.9 (0.90, 1.6) |
| dusthawk_rally | 47.5 (0.87, 3.4) | 45.9 (0.92, 1.8) |
| falcone_f42 | 49.7 (0.86, 3.4) | 48.3 (0.91, 2.0) |
| falcone_heritage | 49.7 (0.86, 3.4) | 48.3 (0.91, 2.0) |
| falcone_sirena | 45.8 (0.85, 3.1) | 44.4 (0.90, 1.7) |
| ferrari_enzo | 43.2 (0.86, 3.0) | 41.8 (0.91, 1.7) |
| koenigsegg_jesko | 40.8 (0.83, 2.8) | 39.5 (0.90, 1.6) |
| mclaren_f1 | 42.6 (0.85, 2.8) | 41.4 (0.90, 1.7) |
| mcmurtry_speirling | 43.1 (0.87, 2.9) | 42.0 (0.91, 1.8) |
| stuttgart_959s | 48.7 (0.86, 3.3) | 47.2 (0.91, 1.8) |
| titan_monster | 59.8 (0.92, 3.9) | 58.2 (0.95, 2.3) |
| viper_proto | 44.8 (0.84, 3.1) | 43.3 (0.90, 1.7) |

Falcone F42 and Jesko (the two the card names): Ardennes braking 64.4 / 62.0 s
and 49.6 / 48.1 s; Ardennes racing line 54.3 / 52.9 s and 45.3 / 43.9 s;
Summit gearbox 45.2 / 43.9 s and 35.6 / 34.5 s; Summit snow 49.7 / 48.3 s and
40.8 / 39.5 s (Casual / Pro). Corners: 7, 7, 4, 3. First braking point at
least 6 s in on every row (6.5 to 10.9 s in these two cars; the Jesko on the Ardennes braking row is the closest at 6.5 s). In snow the
winter run beats the summer run in both cars (2 to 4 s).

## Tests

- `test-lesson-instructor-any-car`: the 14 cars, Casual and Pro, all 11 rows:
  308/308. New rows 112/112, the seven earlier rows 196/196 (run as two halves
  with `--test-name-pattern`, then the lane tier ran the whole file again
  inside its 33 suites). Includes 14.12's room to beat him on every case.
- `test-drive-lesson-2` 44/44 (the two cars, with the new rows' proofs:
  late clip, middle of the road 2.2 to 2.9 s slower), `-3` 23/23 (a faster run beats
  the instructor, margins 1.8 to 4.4 s), `-4` 8/8 (snow: dry braking fails, winter
  faster; was 4 cases), `test-drive-lessons-view-2` 9/9,
  `test-drive-lesson-run` 20/20, `test-drive-lessons` 8/8,
  `test-drive-lesson-lines` 1/1, `test-lessons-v2-view` 3/3,
  `test-drive-lesson-save` 16/16.
- Lane tier (`--changed --jobs 4 --keep-going`): 32 suites passed, 1 failed:
  `test-drive-lesson-helipad` fails with "Cannot read properties of null
  (reading 'getContext')" in `src/heli/pilot-map-view.js` (the test's fake page
  has no map canvas). It fails the same way on the unchanged base commit
  (checked with my changes put aside) and on the integration folder's
  current head, so it is not from this card. It needs its own card; it stops
  the lane tier at suite 15 unless `--keep-going` is used.
- `npm run build`: passes (the usual large-file and dynamic-import notices);
  output deleted.
- Picture scenario: passed on a private port, memory-only saves, 0 warnings,
  0 errors.

## Changed assertions

None. `test-drive-lesson-4` now loops over the snow rows instead of naming
Tremblant Snow; its assertions are the same.

## Pictures

The briefing card with its map for each new row (Falcone, Casual, first
visit, memory-only career, private port), in
`.evidence/2026-10-28/LESSONS-MORE-ROADS/` of the integration folder:
`ardennes-braking-briefing.png`, `ardennes-racing-line-briefing.png`,
`summit-gearbox-briefing.png`, `summit-snow-briefing.png`. They went through
the whole game path (the app's own `startLesson`), so the board's choice and
the start of each lesson are shown to work.

## Removed

Nothing replaced. The temporary picture recipe (a one-off scenario file) and
its output in the lane were deleted after use.

## Claude's review (27 October 2026, night)

Rows meet 14.2, 14.3 and 14.12 in all 14 cars. Deviations accepted: no Eau Rouge row (the Wall Crest launch would need a crest-speed rule; Kyle likes the big air, so no rule is added for a lesson) and no snow hairpin (the Falcone cannot turn inside Summit's snow hairpins on snow, which stays the price of the course). Lesson-only turn names live in the lesson table, course data untouched. No assertion changed; test-drive-lesson-4 now loops over every snow row. Verdict: merge.
