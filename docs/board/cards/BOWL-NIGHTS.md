# BOWL-NIGHTS

The short board entry controls current state, ownership, dependencies and locks.

The season of five nights, each different, as data. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 11. Kyle, 20 November
2026: "the nights repeat each other"; more variety, new challenges, new moves.

## What to build

1. **The season as one table** in `src/bowl/bowl-show.js`, replacing the rule that every night is Car Crush, Freestyle
   and a third event. Each night has a name, its events in order, tonight's tricks, the weapons open, the rival for each
   event, the rival whose score Freestyle must beat, the colour of its flame jets and banners, and its floor dressing.

   | Night | Name | Tonight's tricks | Weapons | Events |
   | --- | --- | --- | --- | --- |
   | 1 | Rookie Night | wheelie, donut, backflip | none | Car Crush · Freestyle (Old Bess's score) · Side by Side (Old Bess) |
   | 2 | Flip Night | front flip, stoppie | none | Long Jump · Freestyle (Rust Rhino's score) · Side by Side (Rust Rhino) |
   | 3 | Hammer Night | spin | hammer | Car Crush, with two Bus Piles · Freestyle (Tin Lizard's score) · Last Truck Rolling (Big Kettle, Tin Lizard, Old Bess) |
   | 4 | Over the Wall Night | barrel roll | hammer or saw | High Jump · Home Run · Last Truck Rolling (Rust Rhino, Tin Lizard, Big Kettle) |
   | 5 | Scrapasaurus Night | side flip, and every double | hammer, saw or launcher | Freestyle (Dragon Wagon's score) · Last Truck Rolling (Dragon Wagon, Rust Rhino, Tin Lizard) · the Scrapasaurus |

2. **The picker** shows each night's name and one line for what is new ("TONIGHT: THE HAMMER"), so that a child sees
   what the night adds before starting it.
3. **The night's card** before the first event carries Big Mo's opening lines (BOWL-HUD moved them off the first event)
   and tonight's trick with its picture and keys.
4. **Saved records** for the new events (Long Jump, High Jump, Home Run, Trick School's lessons are BOWL-TRICK-SCHOOL's)
   in `src/bowl/bowl-save.js`. The switch `titan-bowl` has never been on for players, so no real save holds Bowl records:
   confirm that, add the new event ids without a migration, and keep every existing field readable.
5. **The purse** for each night stays as it is (`BOWL_PURSE`).
6. **Turn Show** offers every event of the season, each as one go.
7. **`docs/WASTELAND_WORLD.md` section 7** is brought up to date from the design card in this card's merge (the events,
   the tricks, the weapons, over the wall, the Scrapasaurus fight), because the design must outlive the cards.

## Files and locks

`src/bowl/bowl-show.js`, `src/bowl/bowl-night.js`, `src/bowl/bowl-rivals.js` (who drives each night comes from the
table), `src/bowl/bowl-lines.js`, `src/bowl/bowl-screens.js`, `src/bowl/bowl-save.js`, `src/bowl/bowl-turns.js`,
`src/bowl/bowl-stadium.js` (a night's colours, read from the table), `docs/WASTELAND_WORLD.md` section 7,
`tools/test-bowl-show.mjs`, `tools/test-bowl-night.mjs`, `tools/test-bowl-save.mjs`, `tools/test-bowl-turns.mjs`,
`tools/scenarios/bowl-night-pay.mjs`. Locks: `bowl-night`, `bowl-screens`, `bowl-rivals`, `save-shape`.

## Checks

1. `tools/test-bowl-show.mjs` and `tools/test-bowl-night.mjs`: each of the five nights runs its own events in order, no
   two nights have the same list, a lost event is tried again, and a won night pays its purse once.
2. `tools/test-bowl-save.mjs`: a save from before this card loads unchanged and gains the new records as they are set;
   reviewed by the save checker (rule 6) with one independent review (rule 17).
3. The scripted drive (one way): `tools/scenarios/bowl-night-pay.mjs` wins Night 1 and is paid. Claude runs it, and
   `tools/scenarios/bowl-turns.mjs` for a Turn Show.

## Sound cues

`bowl.night.open` (a night's card comes up: a short fanfare of its own for each night; stand-in `interface.win`),
`bowl.night.new` (tonight's trick or weapon is shown; stand-in `interface.bonus`).

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-NIGHTS.md`
with a Removed line. Before CARD DONE, search `tools/` for `SHOW_NIGHTS`, `BOWL_RIVAL_NIGHTS`, `nightsWon` and each event's
id and bring each older suite and scenario that names them up to date. No Chrome under `codex exec`: any browser scenario
is "Claude runs". Memory-only saves. No new dependency, network request or key. Clean up nothing outside this lane.
