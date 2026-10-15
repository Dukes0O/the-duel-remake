# EARN-SCREEN

The short board entry controls current state, ownership, dependencies and locks.
This file holds the settled design, the tests and the acceptance. Design:
`docs/EARNED_CARS.md` sections 5 and 7.

```yaml
  - id: EARN-SCREEN
    title: "Medal sheet on the car screen, results lines, earned cars hidden while off"
    owner: codex
    lane: UI
    size: M
    needs: [EARN-MEDALS]
    locks: [busy-game-files]
    flag: earned-cars
    owns: [src/earned-cars-ui.js, tools/test-earned-cars-ui.mjs, tools/scenarios/earned-cars.mjs, docs/changes/EARN-SCREEN.md]
    hooks: [src/app.js, src/screen-garage.js, src/screen-results.js, src/screen-menu.js, src/screen-armory.js, src/screen-router.js, src/screen-leaderboard.js, src/heli/heli-jobs.js, src/audio.js, src/screen-garage.css, src/screen-results.css]
```

## What to build

- `src/app.js`: pass `earnedCarsEnabled` into settlement exactly as
  `grandPrixCareerEnabled` is passed (`app.js` near line 724), and keep the
  returned `medal` and `earnedCars` for the results screen.
- `src/earned-cars-ui.js`:
  - `shownCars(enabled)`: every car in `CARS`, leaving out medal cars when
    the switch is off. Every car list on screen uses it: the garage list, the
    menu car picker and its "01 / 09" count, the "N EARNABLE CARS" note, the
    armory, the rival car choice and the leaderboard.
    The garage's rating bars scale against the cars it shows, so a hidden
    car never changes them. A rival or race setting saved with an earned car
    while the switch was on returns to "match" when it is off.
  - `medalSheetPanel(profile, carId, {grandPrixCareer})` and
    `medalUnlockCard(profile, carId, {helicopter})`: the markup in packet
    5.1. Medal discs are drawn in CSS (bronze, silver, gold); no image file.
  - `medalResultLines(result, {helicopter})`: the lines in packet 5.2.
- Garage (`src/screen-garage.js`): the sheet panel on every owned car under
  the stat bars; the car-list label "MEDALS 4/6" (car 3 adds "· GOLD 4/6");
  the locked page's unlock card; the "MEDAL REWARD" note on an owned earned
  car. The Jesko's label, card and note stay exactly as today.
- Results (`src/screen-results.js`): the new-medal line with its credits
  ("· +250 CR") and the new-car line, and the existing `interface.bonus` cue
  once when either shows. The general bonus list skips `medal`, so the
  amount shows once.
- `src/heli/heli-jobs.js`: `AIR_ONLY_CARS` becomes the Jesko plus every car
  whose `unlockRequirement` is a medal rule. With today's cars it is exactly
  `['koenigsegg_jesko']`. `JOB_CARS` already leaves them out.

## Tests

- `tools/test-earned-cars-ui.mjs` (real App and production screens,
  memory-only; medal cars from the scratch config copy, as in EARN-MEDALS):
  switch off, every car list and count is exactly today's and the save gains
  nothing; switch on, an Easy Rival Duel win fills the box, shows the line
  and plays the cue once; a repeat win adds only to the count; reaching 6
  medals shows the new-car line and owns the car; the locked page shows the
  bars and "No credits"; the Grand Prix row shows its closed note with
  `grand-prix-career` off; the helicopter lines show only with
  `helicopter` on; an earned car is air-only with `helicopter` on; the Jesko
  screens are unchanged.
- Browser scenario `earned-cars` (private port, memory-only, 1280 x 720):
  garage panel, locked page, a results screen with both lines; 0 errors and
  0 warnings. Claude looks at the pictures; they are deleted after review.

## Acceptance

- The tests, the lane tier and the build pass; one ordinary code review.
- Nothing about races, pay, saves or records changes beyond what
  EARN-MEDALS already does.

## Re-sliced while building (Claude, 14 October 2026)

`tools/test-heli-mode.mjs` also gains one approved import for the earned-car
test (it reads `AIR_ONLY_CARS`). `src/audio.js` joins the hooks for one line: the race's sound events go out
before settlement, so the new-medal cue needs its own `{medalEarned: true}`
event, which plays the existing `interface.bonus`. No new sound, and the
`sound-bank` lock is not needed (no cue is added to the bank).
