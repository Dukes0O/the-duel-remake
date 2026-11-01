# WATER-HOOKS: story jobs through the setup, the start and the settlement

Claude (Director), 1 November 2026. Card `docs/board/cards/WATER-HOOKS.md`, part of
The Water Road (`docs/story/wasteland-water-road.md` sections 2, 3 and 11).
Behind the new `water-road` switch, `dev`.

## What changed

- `src/feature-flags.js`: `water-road: 'dev'`.
- `src/story/water-road.js` (new): what each chapter shows and its one button.
  For the open chapter, in order: its job while still to do and its game is open
  ("Race on Sal's road", "Start a Fuel Run", "Hold the fort" ...); the fight once
  the hold is full ("Fight Sawtooth Sal"); otherwise more hold on the territory's
  own road. Every open chapter has a bar: the hold ("2 more wins on Sal's road open
  the fight") or the rank a mode needs ("Fuel Run opens at rank 6. You are rank 4.
  Every race counts."). A road the player does not own yet sends them to Your
  Courses with its price (a new career owns only Pacific Canyon). From the main
  menu, Scrapdome games and fights say "Go to the yard". Locked chapters say what
  to do first. `createWaterRoad(app)` carries the story job's mark: the Story
  card's button asks for it, START uses it, the settlement writes it.
- `src/app.js` (named hooks only): `storyProps('water')` and `openStory('water')`
  (opening reads Hollis's note and V.'s notes so far); `waterStep(id)`,
  `waterArenaChoice`; `setRaceSettings` cancels a story race when the road leaves
  the job's list or the mode is not Mad Max Duel; `startCampaign` and
  `_startArenaFight` mark the story's run (a restart or rematch keeps it) and play
  the job's radio line; the race, Last Car Rolling and Fuel Run family settlements
  add the job's mark to the same profile they save, only on a win, and put
  `waterJob` on the result; `returnToMenu` and a player change clear the mark;
  Vesper's line after the Baron falls; Hollis's end lines on the first yard visit
  after the Baron. `_storySay` speaks while either story's switch is on. Importing
  `water-road.js` registers the Water Road's save and lines, so every load in the
  game cleans `story.water` the same way.
- `src/screen-router.js`: a `data-water-step` button runs `app.waterStep`; a
  Scrapdome job opens the yard's panel with its mode and venue filled; the courses
  answer opens Your Courses; picking another Scrapdome mode or venue tells the app.
- `tools/test-water-hooks.mjs` (new, 81 checks, the real App on memory storage).

## Checks

- `node tools/test-water-hooks.mjs`: 81 checks pass: switch off changes nothing; the
  button fills the setup; Sal's other road keeps the job, another road or mode
  clears it; the same road picked by hand is not the job; a loss, a restart (kept),
  quitting and a win (saved with the race's own rewards, +25 hold, results tick);
  Last Car Rolling and Fuel Run jobs won and saved in their own write; a lost game
  grants nothing; a fight is never a job; the rank bar, Your Courses with the price,
  the fight button; opening the card reads the notes; the end lines once.

## Changed assertions

- `tools/test-feature-flags.mjs`: the switch count goes from 45 to 46 and
  `water-road` joins the switches that stay `dev`. A new switch, nothing loosened.
  Claude's review: approved (a pinned count moved by a deliberate new switch).

## Removed

Nothing.
