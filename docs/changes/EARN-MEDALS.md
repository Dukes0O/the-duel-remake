# EARN-MEDALS

- Task: medal sheets in the save and the earned-car rule (Cockpit T-013).
- Status: complete, switch dev. Kind: save and pay. Built by Claude in place
  of Codex (Kyle, 14 October 2026). Held `save-shape` after FIRE-SAVE.
- Switch: `earned-cars`, dev (new).

## Settled design (docs/EARNED_CARS.md sections 2, 2.1, 3, 4.2, 6, 7)

- `src/medals.js`: the sheet (Duel and Grand Prix rows, Easy, Medium and Hard
  columns, win counts up to 9,999), `normalizeMedals`, `medalRowFor`,
  `countMedalWin`, `medalTotals`, `medalCarProgress`, `medalCarsToGrant`, the
  bonus (a quarter of the difficulty's win pay: 150, 250, 375).
- `src/progression.js`:
  - `normalizeProfile` normalizes `medals` only when the save has it.
  - The Jesko's list is the cars without an `unlockRequirement`: the same
    eight cars as before.
  - `grantCompletionCars` also grants earned medal cars, fully tuned, after a
    race and on load, and never takes one back. The card named a
    `grantMedalCars` in `medals.js`; the grant lives in the existing function
    instead so the Jesko and the medal cars share one path (drivers included),
    and `medals.js` only says which cars are due.
  - `unlockCar` refuses a medal car with its progress ("6 medals needed, you
    have 4.").
  - `settleRace` counts a valid win when `result.earnedCarsEnabled === true`
    and pays `breakdown.medal` for a new medal: outside Pro doubling and lap
    scaling, inside the police-fine cover, zero in the separate Wasteland
    career. It returns `medal` and `earnedCars` only with the switch on.
- No medal car exists in the game yet (EARN-CAR-1 to 3 add them), so the
  grant is tested on a scratch copy with three test cars in `.qa-dist/`,
  recycled after the test.

## Evidence

- `tools/test-medals.mjs`: 10 tests, all pass.
- One-time comparison with the code before this card (7dbbd51c, loaded from
  Git): every switch-off race tested (Duel at each difficulty, Pro, Grand
  Prix, Mad Max Duel, a loss) settled identically, and every saved shape in
  `tools/fixtures/saves/` loaded identically with no sheet added. The test no
  longer loads that commit, because compaction can rewrite commit ids; it
  checks the same promises directly (switch off adds nothing, the switch
  changes only medal fields, the Jesko list, sheets only where saved).
- `tools/test-save-fixtures.mjs`: 12 shapes pass.
- `tools/test-progression.mjs`, `tools/test-feature-flags.mjs` pass.
- Save review (the save checker, independent): CLEAR. Old saves, the new
  fixture, round trips with malformed and `__proto__` sheets, the rollback,
  the credit cap and player isolation all checked.
- Code review (independent): four faults, all fixed. The returned medal said
  375 credits in the separate Wasteland career, where it pays 0; it now reports
  what was paid. The old-code comparison depended on a commit id (above). A
  `__proto__` car id was lost from a sheet; it is now skipped. The packet said
  any version other than 1 is kept; it now says a newer whole-number version.
- Lane tier and build: see below.

## Changed assertions

Each is the same kind of change FIRE-SAVE made for its own fixture and switch.

- Fixture roster 11 to 12 for the new `12-medals.json` (a well formed saved
  sheet with an unknown car, and a second player with no sheet):
  `tools/test-save-fixtures.mjs`, `tools/test-arena-settlement.mjs`,
  `tools/test-career-backup.mjs`.
- Switch list: count 27 to 28 and `earned-cars` must stay dev
  (`tools/test-feature-flags.mjs`); `earned-cars: 'dev'` added to the exact
  list in `tools/test-wasteland-beta.mjs`; `start-preview.bat` requests
  `earned-cars` like every other dev switch (checked by
  `tools/test-preview-launcher.mjs`).
- The fixture first had a malformed entry, as the card asked. Two suites
  compare every fixture byte for byte with older code
  (`test-grand-prix-podiums.mjs`, `test-deep-save.mjs`), and older code keeps
  a malformed entry that this card drops, so they failed on it. Real saves
  never hold a malformed sheet, so the fixture holds a clean one; the
  malformed cases stay in `tools/test-medals.mjs`. No assertion in those two
  suites changed.

## Removed

Nothing. The Jesko's rule and code stay; only its list is narrowed to bought
cars, which leaves today's eight unchanged.
