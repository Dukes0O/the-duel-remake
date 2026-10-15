# EARN-SCREEN

- Task: the medal sheet on the car screen, the results lines, and earned cars
  hidden while the switch is off (Cockpit T-013).
- Status: complete, switch dev. Kind: screens. Built by Claude in place of
  Codex (Kyle, 14 October 2026). Held `busy-game-files` after
  P4-SUMMIT-ATTACK for the one `src/app.js` change.
- Switch: `earned-cars`, dev (from EARN-MEDALS).

## Settled design (docs/EARNED_CARS.md section 5)

- `src/earned-cars-ui.js`: `shownCars` and `shownCarIds` (medal cars only
  with the switch on), `medalProgressLabel` ("MEDALS 4/6", "MEDALS 20/24 ·
  GOLD 4/6"), `medalSheetPanel`, `medalUnlockCard`, `medalResultLines`.
- Garage: the medal sheet panel on every owned car, under the stat bars; the
  list label; the locked page ("EARNED, NOT BOUGHT", medal and gold bars, no
  Buy button, "No credits", the Kestrel One line with the helicopter on); the
  "MEDAL REWARD" note on an owned medal car. The rating bars scale against the
  cars shown. The Jesko's label, page and note are unchanged.
- Results: the new-medal line with the credits actually paid, and the
  new-car lines; the general bonus list leaves `medal` out so it shows once.
- Every car list uses `shownCars`: the garage, the menu picker, its "01 / 09"
  count and the "N EARNABLE CARS" note, the armory, the rival car choice and
  the leaderboard filter. A hidden car is never the menu car, and a hidden
  rival car returns to "match".
- `src/app.js`: passes `earnedCarsEnabled` to settlement beside
  `grandPrixCareerEnabled`, copies `medal` and `earnedCars` onto the result,
  and sends one `{medalEarned: true}` sound event. Settlement runs after the
  race's own sound events, so the cue needs this event; `src/audio.js` plays
  the existing `interface.bonus` for it (one line). The card did not list
  `src/audio.js`; it is the smallest place for the named cue.
- `src/heli/heli-jobs.js`: `AIR_ONLY_CARS` is the Jesko plus every medal car;
  with today's cars it is exactly `['koenigsegg_jesko']`.
- Medal discs are drawn in CSS (`src/screen-garage.css`); no image file.

## Evidence

- `tools/test-earned-cars-ui.mjs`: 4 tests, all pass. A real App Rival Duel
  at Easy fills the box, shows the line and plays the cue once, a repeat adds
  only to the count; switch off adds nothing; on a scratch copy with three
  test medal cars (recycled after) the lists, counts, labels, locked pages,
  rewards, air-only list and the hidden menu and rival car all behave.
- Existing suites that render these screens pass unchanged:
  `test-koenigsegg-ui`, `test-driver-ui`, `test-course-access-ui`,
  `test-heli-jobs`, `test-heli-hooks`, `test-grand-prix-career-menu`.
- Browser scenario `earned-cars` (private port, memory-only, 1280 x 720): the garage medal sheet and a Hard win's results line ("NEW MEDAL · GOLD · FALCONE F42 · DUEL · HARD · +375 CR", 2,125 credits = 1,500 + 150 clean + 100 clean debut + 375 gold); 0 warnings, 0 errors. Claude looked at both pictures: the first round's row-label column took a quarter of the width, so it was narrowed to 84 px and checked again. Pictures recycled after review.
- Lane tier (`--changed --jobs 4 --keep-going`, from PowerShell, integration merged in): 180 suites passed, 0 failed, 839 s. The run before failed only `test-heli-mode.mjs` on its import rules (see Changed assertions). Build passed.
- Review (independent, code read only while the release frame check ran): no
  blocking faults; four small ones, all fixed. The cue test counted events,
  not sounds, so a new test gives the sound code a stand-in running context
  and checks `interface.bonus` plays exactly once. The medal table sat 12 px
  left (a 100% table ignores its negative margins); widening it made it spill
  out of the panel, which the browser check caught, so the negative margin
  went and the cells now sit evenly 6 px in from both edges. The menu's first count text used every car; it now
  uses the shown list. `src/audio.js` was outside the card's files; the card
  now lists it with the reason.

## Changed assertions

- `tools/test-heli-mode.mjs`: the list of files allowed to import helicopter
  code gains `tools/test-earned-cars-ui.mjs -> heli/heli-jobs.js`, because the
  earned-car test checks the air-only list this card extends; and the list of
  modules a helicopter rules file may import gains `../medals.js` (pure rules,
  imports only `config.js`), for `AIR_ONLY_CARS`. Nothing else in those checks
  changed.

## Removed

Nothing.
