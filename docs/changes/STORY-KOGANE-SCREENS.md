# STORY-KOGANE-SCREENS: the Story card and the story on the existing screens

Switch: `kogane-invitation`, state `dev` (off in the game). With it off, every screen below is exactly as before: no button, no card, no panel, no plaque, no Daichi line, no lead line, and every car list is today's.

Built against the plain object of `docs/story/kogane-invitation.md` 12.1, `app.storyProps()`: `{available, step, read, steps: [{id, state, note, button}], fireClosed, skylineOwned, lead}`, plus `app.openStory()` and `app.startStoryDuel()`. The hooks card writes those on the app later; the tests use a stub of that shape. A newer game's story gives `available: false` (or no step), and then nothing shows.

## What changed

- `src/story/story-ui.js` (new): all the story's screen words and markup, as plain functions.
  - The Story card: Daichi's letter first (word for word from `story-lines.js`), then the four parts as a list with ticks. Each part is done, next or locked. The next part has one button ("Start the lesson", "Go to the helipad", "Race Daichi"); Ana's part has no button, only her words, which show once she has called. A locked part says what to do first in plain words. The game's own notes and button words win over the defaults.
  - The closed-by-fire message ("Kogane Pass is closed after the fire and opens again in N play days. The lesson and the duel wait. Your progress is kept."). The lesson and duel buttons are disabled while it shows; the flight is not.
  - The prize line, the garage panel, the Skyline plaque ("Won from Daichi Mori, Kogane Pass at night"), the Deep log lead line ("LEAD: Lake Kogane. A long dark shape on the lake bed. Not dived yet."), the results card and Daichi's line, the menu button and red dot, and the front door's Next up wording.
  - `createStoryUi`: puts the card on the stage. Opening it calls `app.openStory()` (the letter is read, only the dot goes away) and draws from a fresh `app.storyProps()`. "Race Daichi" calls `app.startStoryDuel()`. The lesson and helipad buttons click the existing Instructor and Helipad controls. Close button and Escape close it. It never opens over a race.
- `src/story/story-ui.css` (new): the card in the menu's own look with a small red seal, ticks, the dot, plaque, grey lead line. Loaded only when the card is made (switch on), so nothing loads with it off.
- `src/screen-menu.js`: with the switch on, adds the STORY button (with its red dot) after the helipad button, opens the card from any `[data-story-open]` control (the button, the front door's Next up card, the garage panel), keeps the button and dot in step with the story on every menu refresh, and puts the Skyline in the car picker only once owned.
- `src/menu-front-door.js`: `frontDoorFacts` takes an optional `story`; `chooseNextUp` gains a story entry just after an open Lab lesson and before a new course ("A letter from Daichi Mori is waiting...", "Your story is open: ..."); the Next up card shows the red dot while a message waits. The front door has no ninth door, so the Next up entry is the story's door there; the plain Story button is also in the Race options drawer.
- `src/screen-router.js` (one line, outside the owned list, needed): `currentDoorFacts` passes `story` from `app.storyProps()` only while the switch is on.
- `src/screen-garage.js`: the "THE KOGANE INVITATION" panel with the prize while the story is open (before the duel is won); the plaque on the Skyline's page after the win; the Skyline listed only once owned (as the Sirena is); the Deep log's lead line inside the sea-life log.
- `src/earned-cars-ui.js`: `isShownCar`, `shownCarIds` and `shownCars` take an optional third argument `story`. When true, the Skyline is on no list. It is false by default, so every other caller (armory, leaderboard, rival picker) is unchanged.
- `src/screen-results.js`: for the story's own race (`result.story === 'kogane-night-duel'`) only: a win shows a "NEW CAR" card ("Nissan Skyline GT-R R34, won from Daichi Mori") and his winning line; a win with the car already owned shows only the kind line; a loss shows his line. The usual buttons stay. A win that granted nothing shows nothing.
- `src/feature-flags.js`: the new switch. `start-preview.bat` (outside the owned list, needed): Preview asks for it, as `tools/test-preview-launcher.mjs` requires for every dev switch.
- `tools/test-story-ui.mjs` (new): 204 checks, and 225 more when it re-runs itself on the preview roster (the Skyline only exists there).

## Tests

- `tools/test-story-ui.mjs`: switch declared dev and off in the game and in QA; with it off the menu, front door, garage, results and card show nothing and no button is added; each part's state and button (letter step, lesson, supplies, duel, Ana, finished); locked parts name what to do first; the game's notes win; steps default from the current step; a newer save or missing story gives no view; the closed-by-fire message for N days, one day, a plain number and no count, with the lesson and duel buttons disabled and the flight not; the card on screen (open reads the letter, each button goes where it should, close, Escape, a waiting button does nothing, never over a race or with the switch off); the menu button and dot for every step; the front door entry and dot for every step and its place in the order; Daichi's lines on the results screen (win, already owned, loss, no mark, switch off); the garage panel, the plaque (only after the win, never from a newer game's story) and the lead line; the Skyline hidden until owned and shown after in the garage list, the menu picker and the results card; every screen text has no dash and no developer word; the sources have no dash.
- Lane tier from PowerShell (`node tools/run-tests.mjs --tier lane --changed --jobs 2 --keep-going`): 87 passed, 0 failed. No suite failed on the Recycle Bin cleanup this time.
- `npm run build` passes; the card's stylesheet is built as its own file.
- `tools/test-repo-hygiene.mjs` passes.

## Changed assertions

- `tools/test-feature-flags.mjs`: the switch count goes from 43 to 44 (the new switch itself). `kogane-invitation` is added to the list of switches that must be `dev`, and the message names it. Nothing is loosened.

## Not done

- The sound cues (`interface.bonus` once per step, once more with the new-car card) belong where the events happen in `src/game.js` and `src/app.js`, which the hooks card owns.
- "Start the lesson" opens the Instructor board by pressing the existing Instructor control; choosing Kogane Pass there is the lesson and hooks cards' job. "Go to the helipad" presses the existing helipad control the same way.
- The armory, leaderboard and the rival-car picker in the router still list the Skyline whenever its own `nissan-skyline` switch is on (they do not pass the new argument). The hooks card needs the rival picker to keep the Skyline for "Race Daichi", so it was left alone; V6's earn rule decides the rest.
- No look check in the browser pane (Claude's FINISH card plays the chain); the card's layout was written to the menu's existing look and not yet seen on screen.

## Removed

Nothing removed. The Skyline's shop-style listing is replaced by "listed only once owned" for the story, in the same change; V6 removes the planned price and Buy path.

## Claude's review (28 October 2026, night)

Claude reviewed: everything behind kogane-invitation (dev); car lists unchanged with it off (story defaults false); rule 18: switch count 43 to 44 and the dev list gain the new switch, nothing loosened. Layout not yet seen on screen (FINISH).
