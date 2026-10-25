# LAB-RULES

The Lab's rules, without any screen: the sixteen lessons and when each opens, what the shop sells and for how much, the saved `profile.lab` field, and the helicopter numbers the upgrades change. Design: `docs/LAB.md` sections 3, 4, 9 and 10. Holds the `save-shape` lock. Switches `lab` and `lab-tuning` are added in `src/feature-flags.js`, both dev, so nothing a player sees changes.

## What was added

- `src/lab/lab-lessons.js`: the 16 lessons in four groups (Flying 5, Workshop 4, Wind tunnel 5, Snow 2). `lessonOpenState(profile, id, flags)` and `lessonRows(profile, flags)` give rows `{group, id, name, open, done, note}` for the shared board (`src/lessons/lesson-board.js`, not edited); the board is empty while `lab` is off. Flying opens when `helicopter` is on and all four helicopter lessons are done ("Opens with the helicopter" otherwise). Workshop is open from the start, except G-force. G-force and the whole Wind tunnel open after driving lesson 1 (`drivingLessons.done.corner`). Snow opens when `helicopter` and `heli-skiing` are on (`heli-skiing` is not in the catalogue yet, so it reads as off).
- `src/lab/lab-shop.js`: the 15 upgrades with the prices of section 4 (Spéirling 15,000 from section 6) and `buyUpgrade(profile, id, {flags})`: needs the lesson that opens it, takes the price once, refuses a second purchase, Engine 2 needs Engine 1, Spéirling needs the REVERSE switch found.
- `src/lab/lab-save.js`: `profile.lab` with `normalizeLab`, `labOf`, `passLesson` (grants free rewards: Aerials with Launch angles), `setRing`, `setCable`, `setTune`, `recordStockLap`, `payTunedBonus` (400 credits once per course, credits stop at 1,000,000,000), `markSecret`. Every function takes `{flags}` and does nothing, returning the same profile, while `lab` is off.
- `src/lab/lab-heli.js`: `heliUpgrades(lab)` returning `{thrustFactor, emptyMassKg, hookLimitKg, lineLengthM, bucketLitres, ringIndex, retardant, altitudeScaleM}`; with nothing owned (or no Lab, or a newer-version Lab) it equals today's 1, 1150, 1500, 15, 600, 0, false, 8500 (read from `KESTREL`, `CABLE`, `BUCKET` themselves). Nothing in `src/heli/` calls it yet; LAB-HELI does.
- `src/progression.js`: one line in `normalizeProfile`, same pattern as `heli` and `drivingLessons`: `lab` is normalized only when saved, never added to an older save.
- `tools/test-lab-rules.mjs` (17 tests), written before the code: switches, lesson order and groups, opening rules, prices and what opens each, buying once, Engine 2 after Engine 1, free rewards, ring/cable/tune/stock-lap/bonus/secret rules, the save (every key optional, junk, unknown keys, newer version, idempotence, old fixtures gain nothing), empty-Lab `heliUpgrades`, each upgrade changing only its own number, switch off changes nothing.
- Save fixture `tools/fixtures/saves/17-lab.json` (a student with a full Lab including an unknown key, and an old player without one).

## Decisions (1 and 2 approved by Claude, 24 October; `docs/LAB.md` section 9 now lists `ringBest`)

1. **One optional key beyond section 9: `ringBest` (0..3).** Section 4.1 lets a player pick any ring they have earned, but section 9 saves only `ring`. `ringBest` is the best ring earned; `ring` is the one in use and is never above it. Optional like every key; an old or sparse save reads 0.
2. **"The helicopter's first lessons"**: read as all four helicopter lessons (the flying challenges carry crates and a car).
3. Other choices inside the card: a number outside -2..+2 in a saved tuning setting reads as 0 rather than being clamped; a Lab from a newer version is kept exactly and never written over (like driving lessons); unknown ids inside `done` and `owned` are kept when they are plain `true` flags so going back one release loses nothing; the Spéirling is in the shop catalogue only so `owned.speirling` has a home, LAB-FAN builds the car.

## Save review

This card holds `save-shape`, so it needs the save checker and one independent save review. Save checker: `node tools/test-save-fixtures.mjs` passes with the new fixture (16 shapes, 614 checks). Changed assertions there: the roster count 15 to 16, and one added check that a saved `lab` is kept exactly while an older save gains no `lab` field (same as the existing `heli` and `drivingLessons` checks). No other assertion was changed. The independent review is below.

## Independent save review

A fresh reviewer read the save code, the fixture and the tests without my conclusions. It found two things, both fixed and now tested: (1) a `drivingLessons` field from a newer game (`{version: 2}`, or `done: null`) made `lessonOpenState` throw and so stopped the Lab board and `passLesson`; it now reads that field only at version 1 and never throws. (2) The `lab-tuning` switch was declared but unused, so tuning steps, stock laps and the 400-credit bonus worked with only `lab` on; those three now also need `lab-tuning`. It confirmed: old saves gain and lose nothing, a version 2 `lab` is handed back exactly and never written over, no key injection through the maps, credits taken once and capped, nothing mutates its input, and every switch-off path returns the same profile. Optional nits left as they are: `payTunedBonus` reports `bonus: 400` even when the wallet was already at the cap; the tune row accepts the fuel setting for any car (the electric-car rule belongs to LAB-TUNE).

## Switch inventory (Claude's written review wanted, rule 18)

`tools/test-feature-flags.mjs`: switch count 33 to 35 (plus circuit switches), `lab` and `lab-tuning` added to the list that must be dev, wording of the label adjusted. `tools/test-wasteland-beta.mjs`: two rows added to the expected catalogue. Two switches added, nothing loosened.

## Tests

Run once on the branch after merging current `origin/integration/wasteland` (24 October): `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`: 300 passed, 6 failed. The six fail the same way on an untouched checkout of `integration/wasteland`, so none comes from this change: `test-course-kit` (subtest 8), `test-earned-cars-ui` (5), `test-medals` (10), `test-full-check` (42, a Windows Junction), and `test-salt-flats` and `test-salt-flats-art` (they open `C:\Users\kyleb\dev\art-library\kenney-car-kit`). `npm run build` passes. Card checks, all passing: `tools/test-lab-rules.mjs` (19 tests), `tools/test-save-fixtures.mjs` (the save checker: 16 shapes, 614 checks, with `17-lab.json`), `tools/test-feature-flags.mjs`, `tools/test-wasteland-beta.mjs`, `tools/test-preview-launcher.mjs`, `tools/test-heli-mode.mjs`.

Pinned numbers moved by this card, one reason each: switch count 33 to 37 in `test-feature-flags` (35 plus `heli-skiing` and `cpu-racecraft` already on integration; `lab` and `lab-tuning` are the two new rows); fixture roster 15 to 16 in `test-save-fixtures`, `test-arena-settlement` and `test-career-backup` (the new `17-lab.json`); `test-heli-mode` approved-importer list gains `src/lab/lab-heli.js`, `src/lab/lab-lessons.js` and `tools/test-lab-rules.mjs` (the Lab reads the helicopter's own numbers and lessons); `start-preview.bat` requests `lab,lab-tuning` (the preview launcher test requires every dev switch). Not run in the cloud: browser scenarios, Windows-only suites, the full tier.

## Removed

Nothing.
