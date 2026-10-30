# NISSAN-SKYLINE-GTR-R34-V6: the Skyline is a prize, not a shop car (earn rule)

Switches: `nissan-skyline` and `kogane-invitation`, both still `dev` (off in the game). With them off the car does not exist in the game and nothing below shows.

The card was planned as "buy rule, garage and shop". The Kogane story (`docs/story/kogane-invitation.md` section 11) rewrote it to the earn rule: the Skyline is won from Daichi, never bought.

## What changed

- `src/config.js`: the Skyline's entry gets `unlockRequirement: 'kogane-duel'` and still has no price. That keeps it out of `CAR_PRICES` (no price for any car with an unlock rule) and stops `src/race-settings.js`, `src/paint-presets.js` and `src/yeti.js` treating it as owned: they count a car with no price and no rule as free, and now it has a rule, so only a player whose garage holds it owns it. `excludeFromCompletion: true` stays, so the Jesko still reads "of 8".
- `src/earned-cars-ui.js`: `isShownCar`, `shownCarIds` and `shownCars` now hide the Skyline always, as they hide the Sirena. The story-only third argument is removed (replace means remove). New `wonCars(profile)` gives the Skyline back as a list entry for a player who owns it.
- `src/screen-garage.js`, `src/screen-menu.js`: the Skyline joins the garage list and the menu car picker once owned, with or without the story switch (before, only with the story on; with it off an unowned Skyline was listed with a price line). The garage keeps its story panel and plaque.
- `src/screen-armory.js`, `src/screen-leaderboard.js`: the car lists use `wonCars`, so the Skyline is offered to an owner only.
- `src/screen-menu.js` (rival picker): the player's own "Customize your rival" list offers the Skyline only to an owner. A saved Skyline rival falls back to "Match my car" for anyone who does not own it. Daichi is not affected: the story sets him itself in `src/story/kogane-duel.js`, not through this picker.
- "EARNABLE CARS" on the start line does not count the Skyline (it reads `shownCars`).
- `src/paint-presets.js`: the three extra finishes (Skyline White, Sonic Silver, Midnight Black), 250 credits each, usable only on the Skyline. Values match `SKYLINE_PAINTS` in `src/skyline-vehicle.js`. Bayside Blue is its factory finish. Copper and Glacier work on it as on any car.
- Already in place and kept: the `ROAD_CLASS` line in `src/race-field.js` (Grand Prix mixed fields); upgrades, medals and Mad Max armour use the usual owned-car checks.
- Not touched: `src/app.js`, `src/game.js`, `src/progression.js`.

## Tests

- `tools/test-skyline-handling.mjs` (preview roster): config rule, no price and not in `CAR_PRICES`; Jesko "of 8" for an owner; for an unowned Skyline, no buy even with 100,000 credits, no upgrades, no paint, no yeti roof, race settings fall back to the starter; for an owner, race settings keep it, three upgrades at 350, 600 and 950, the three finishes at 250 credits for this car only and equal to the model's values, the generic finishes, duel and Grand Prix medals, and a save and load round trip in memory-only storage.
- `tools/test-story-ui.mjs`: lists (no Skyline anywhere unowned, with the story on or off; `wonCars`), garage, menu picker, armory, scores car list, rival picker (offered only to an owner; saved rival falls back or stays), EARNABLE CARS, picker markup. 240 checks on the preview roster.
- Lane tier from PowerShell (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 88 passed, 0 failed. No suite failed on the Recycle Bin cleanup this run. `npm run build` passes.
- Also run by hand and passing: `test-save-fixtures` (24 shapes, 1 forged), `test-story-save`, `test-story-hooks`, `test-story-kogane-duel`, `test-skyline-vehicle`, `test-audio`, `test-vehicle-assets`, `test-vehicle-paint`, `test-paint-integration`.
- Players who own the Skyline: no new save fixture file. The fixtures run with the Skyline switch off, where the car does not exist and a save may not name it, so an owner is tested as a round trip on the preview roster instead (`test-skyline-handling.mjs`). The 24 historical fixtures load unchanged.

## Changed assertions

- `tools/test-paint-presets.mjs`: the catalog count goes from 8 to 11 (the three Skyline finishes). Nothing loosened; the message names them.
- `tools/test-story-ui.mjs`: "with the story off the Skyline is listed as today" and "garage: switch off, the list is today's" are replaced by "the Skyline is on no list" and "an unowned Skyline is still not listed". They changed because the card now says the Skyline appears nowhere for a player who does not own it, whatever the story switch says. The old reading would have shown an unowned, unbuyable car. The two `shownCarIds(..., true)` checks lose their story argument (it no longer exists) and now check the same hiding for both values of `enabled`. An owner still sees the Skyline in the garage with the story off (that check is unchanged).
- `tools/test-skyline-handling.mjs`: the message "V6 owns the shop price" becomes "no price: the Skyline is never bought". The assertion (no entry in `CAR_PRICES`) is unchanged.

## Removed

- The planned buy path: no price, no Buy button, no "UNLOCK CAR" card and no 6,000 price line were built. The story-only `story` argument of `isShownCar`, `shownCarIds` and `shownCars`, and the `storyCarsOn` conditions in the garage and menu, are gone.

## Not done

- No look check in the browser pane (the FINISH card plays the chain). The armour kit model for the Skyline and the garage preview art belong to other cards.
- A Skyline owner's rival picker option and the armory entry were tested with plain stand-ins, not seen on screen.

## Claude's review (28 October 2026, night)

Independent review: approve, no faults (only the story grant adds the car; owners keep full use; other cars unchanged; old saves fall back). Rule 18 written review: paint catalog 8 to 11 for the three finishes; story-ui checks now require the Skyline hidden until owned, as the card asks (stricter, not looser); handling test message text only.
