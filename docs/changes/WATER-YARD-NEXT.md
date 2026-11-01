# WATER-YARD-NEXT: the yard says what to do next

Claude (Director), 1 November 2026. Card `docs/board/cards/WATER-YARD-NEXT.md`,
part of The Water Road (`docs/story/wasteland-water-road.md`). A plain fix, no switch.

## What changed

- `src/screen-yard-home.js`: `yardNextStep(profile, {featureFlags})` reads the save
  and names the next step: the first warlord on the ladder not yet beaten, then
  either "is waiting. Open the TERRITORY MAP and press FIGHT." or how many more wins
  open the fight and where they count (the territory's roads by name, Last Car
  Rolling in the Scrapdome for Kettle, Convoy Raids on the Salt Flats for the
  Tollkeeper with "they open at rank 9" while closed). The Baron's line names the
  warlords still to beat; a finished career says every warlord is beaten. The yard
  home and CAREER panels both show it. With no warlord fights in the yard the old
  "Warlord fights are coming later." line stays.
- `tools/test-yard-next.mjs` (new, 7 cases): new career, half and nearly full hold,
  open fight, after Sal falls (no Sal line on either panel), Kettle and Tollkeeper
  routes with the rank note, the Baron and a finished career, the save is never
  changed by reading, and the coming-later line.

## Checks

- `node --test tools/test-yard-next.mjs`: 7 of 7 pass.
- Lane tier and build: see below.

## Changed assertions

None.

## Removed

The fixed lines "Sal is waiting on the territory map." and "Fill Sal's territory
hold to fight her from the map." in `src/screen-yard-home.js`.
