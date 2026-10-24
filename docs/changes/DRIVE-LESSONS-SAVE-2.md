# DRIVE-LESSONS-SAVE-2: save fields for lessons 2 to 4 (switch `driving-lessons`, dev)

Section 12.9 of `docs/DRIVING_LESSONS.md`. Holds the `save-shape` lock. Pure profile
operations in `src/lessons/drive-lesson-save.js`; nothing in the game calls the new
parts yet (the view card does).

## What was built

- `profile.drivingLessons` accepts the optional keys `line`, `gears` and `snow` in `done`,
  `best` and `rewarded`. They are validated only when present (a bad value becomes false or
  null; valid siblings and unknown keys survive) and never added to a save that lacks them,
  so an old save loads and saves exactly as before. `progression.js` is unchanged.
- `DRIVE_LESSON_ORDER` (corner, line, gears, snow) and `DRIVE_LESSON_UPGRADE` (brakes,
  handling, engine, tires; the game's own upgrade key for tyres is `tires`).
- `driveLessonAccess(drivingLessons, id, {engineCurve})` says whether a lesson can be played:
  line follows corner; gears follows line and answers "Opens later" while `engineCurve` is off;
  snow follows gears, or line while gears is not open. Progress from another version opens
  nothing and never throws.
- `finishDriveLesson(profile, id, margin, carId, {engineCurve})` takes the new ids. A new lesson
  must be open; one already done can always be retaken. The first pass of line gives one handling
  level, gears one engine level, snow one tires level on the car passed in, or 600 credits when
  that upgrade is already level 3 (or the car is factory-maxed); once each. Everything else is
  as lesson 1: same car rules, newer saves refused, input never mutated, failures return the
  same profile object.
- The reward's `credits` now says what was really paid when the wallet cap trims it.
- Fixture `tools/fixtures/saves/11-driving-lessons.json` gains the player "All Four" (all four
  done, with their rewards) between the existing two, and five more assertions.

## Save review

The card holds `save-shape`, so it has the save checker and one independent save review.
Save checker `node tools/test-save-fixtures.mjs`: 16 shapes, 634 checks pass (the
new player adds checks; no assertion was changed or loosened).

A fresh reviewer read the diff cold, tried to break it with probe scripts, and found one fault
and some notes. The fault: `driveLessonAccess` threw on a newer-build save (`{version: 2}`,
`done: null`) and disagreed with `finishDriveLesson` about it. Fixed: another version's
progress opens nothing, options may be null, and tested. It confirmed: old saves gain and lose
nothing and normalise to themselves; newer saves come back unchanged and are never written
over; no key injection through the maps or the lesson and car ids (`__proto__`, `constructor`,
`toString`); each reward pays exactly once, upgrades cap at 3 and credits at 1e9; the input is
never mutated and a failure returns the same object; malformed values never throw and never
corrupt valid siblings; nobody gets stuck (a save with gears done and the switch off still
opens snow after line and still settles the gears reward). Left as notes: the reward's credits
fix above was a cosmetic note it raised; `engineCurve` must be exactly `true`, so the caller
passes a boolean.

One pre-existing thing it noticed, not from this change and not touched: `normalizeDrivingLessons`
replaces a value whose `version` is not 1 and not a whole number above 1 (such as `{}`, `"2"`,
`2.5`, `0`) with a blank record, so a load followed by a save would replace it. Real newer
builds write whole-number versions, which are kept. A card could keep every unrecognised
version as it is if Kyle wants that; it needs Claude's call because it touches the save shape.

## Checks (Linux cloud)

- `tools/test-drive-lesson-save.mjs`: 16 tests (7 existing, unchanged; 9 new for the keys,
  the order, each reward once, the 600-credit cases, locks, old saves, newer saves, a round trip
  through memory storage, and the access edge cases).
- Lane tier after merging current `integration/wasteland`: see the end of this note.
- Not run here: browser checks and Windows-only suites (none touched).

## Removed

Nothing.
