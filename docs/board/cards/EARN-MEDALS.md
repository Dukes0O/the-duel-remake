# EARN-MEDALS

The short board entry controls current state, ownership, dependencies and locks.
This file holds the settled design, the tests and the acceptance. Design:
`docs/EARNED_CARS.md` sections 2, 3, 4.2, 6 and 7.

```yaml
  - id: EARN-MEDALS
    title: "Medal sheets in the save and the earned-car rule"
    owner: codex
    lane: SAVE
    size: M
    needs: [EARN-PACKET]
    locks: [save-shape]
    flag: earned-cars
    owns: [src/medals.js, tools/test-medals.mjs, tools/fixtures/saves/12-medals.json, docs/changes/EARN-MEDALS.md]
    hooks: [src/progression.js, src/feature-flags.js, tools/test-save-fixtures.mjs, tools/test-feature-flags.mjs]
```

## What to build

- `src/medals.js`, pure, no screen code:
  - `MEDAL_ROWS = ['duel', 'grandprix']`, `MEDAL_LEVELS = ['easy', 'medium', 'hard']`.
  - `normalizeMedals(value)`: packet 6.1 and 6.2 (counts 0 to 9,999; keep
    well formed entries for unknown car ids, at most 64, ids up to 64
    characters; drop malformed ones; a version other than 1 is returned
    untouched).
  - `medalRowFor(result)`: `'grandprix'` for a Grand Prix, `null` for Time
    Trial, otherwise `'duel'`.
  - `countMedalWin(profile, {car, row, cpuDifficulty})`: returns
    `{profile, newMedal}`; creates `profile.medals` on the first counted win;
    does nothing for a version other than 1.
  - `medalTotals(profile)`: `{medals, gold}` over cars in `CARS` only.
  - `medalCarProgress(profile, carId)`: `{medals, needMedals, gold, needGold,
    eligible, unlocked}` for a car whose `unlockRequirement` is
    `{kind: 'medals', medals, gold}`.
  - `grantMedalCars(profile)`: adds every eligible, unowned medal car to
    `unlockedCars` with factory-maxed upgrade levels, like
    `grantCompletionCars`; never removes a car.
- `src/progression.js` hooks only:
  - `unlockCar`: for a medal car, refuse with its medal progress ("6 medals
    needed, you have 4"), never the price path or "already included".
  - `normalizeProfile`: normalise `medals` only when present
    (`Object.hasOwn(value, 'medals')`), then `grantMedalCars` after
    `grantCompletionCars`.
  - `completionCarProgress`: the Jesko's list is the cars without an
    `unlockRequirement` (eight today, exactly as now).
  - `settleRace`: after every existing guard, when
    `result.earnedCarsEnabled === true`, the race is `won` (already
    `result.won && isValidFinish(result)`), not qualifying, not practice and
    `medalRowFor(result)` is not null, call `countMedalWin`, then
    `grantMedalCars`. Add `medal` (the new medal, or null) and `earnedCars`
    (ids newly owned) to the returned object.
  - The medal bonus (packet 2.1): a new medal adds `breakdown.medal`, a
    quarter of `CPU_REWARDS` for that difficulty (150, 250, 375), paid once
    per box. It joins the race's gross like `breakdown.milestones`: outside
    the Pro doubling and the lap scaling, inside the police-fine cover, and
    zero in the separate Wasteland career. Every other credit, record and
    field is unchanged.
- `src/feature-flags.js`: `'earned-cars': 'dev'`, beside the other Phase 4
  switches, with its additive assertion in `tools/test-feature-flags.mjs`.

## Tests (`tools/test-medals.mjs`, memory-only)

1. Each counted case: Duel row from Rival Duel, Mad Max Duel and a one-car
   event win; Grand Prix row from a first place; the right column from the
   CPU difficulty; Arcade and Pro alike; counts rise per win; the medal is
   new only once.
2. Each refused case: loss, abandoned, invalid finish, duplicate run key,
   a practice course, qualifying, Time Trial, Grand Prix second place, switch off
   (`earnedCarsEnabled` absent): the profile is unchanged field for field.
3. Grant: through a scratch copy of the config in `.qa-dist/` with three
   test medal cars (6; 15; 24 with 6 gold), reached after a race and on
   load; arrives factory-maxed; never removed when the numbers change; gold
   condition enforced; unknown and rolled-back car entries kept and not
   counted. No test car is added to the real `src/config.js`.
4. The Jesko: the list is still the eight bought cars; every existing
   Jesko test passes unchanged; an owned Jesko and Axel stay owned.
5. Old saves: every fixture in `tools/fixtures/saves/` loads and saves back
   to the same result as the pre-card build's `normalizeProfile`, with no
   `medals` field added.
6. Rollback (packet 6.4): a save with medals and an earned car passed
   through today's `normalizeProfile` (the code before this card, kept as a
   copy in the scratch tree) keeps `medals`; loading it back in the new build
   restores the earned car.
7. Named players: one player's wins never reach another's sheet.
8. Medal bonus: exact credits for bronze, silver and gold in a Duel and a
   Grand Prix; paid once per box (a second win and a repeated run key pay
   no bonus); Pro does not double it; a 5- or 10-lap race does not scale it;
   a police fine can take from it as from a milestone; zero in the separate
   Wasteland career; nothing with the switch off. Every existing pay test
   passes unchanged.
9. The new fixture `12-medals.json` (medals for real cars, one malformed
   entry, no earned car: none exists yet, and the fixture test would drop its
   id; EARN-CAR-1 adds it); `tools/test-save-fixtures.mjs` roster 11 to 12, explained in the
   change note.

## Acceptance

- The tests above, the lane tier and the build pass. A fresh save review
  (the save checker) and an ordinary code review are recorded in
  `docs/changes/EARN-MEDALS.md`.
- With the switch off, no race and no save changes in any way.
- Apart from the medal bonus, no credits, prices, pay, records, ghosts or
  replays change.
