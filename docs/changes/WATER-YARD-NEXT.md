# WATER-YARD-NEXT: the yard says what to do next

Claude (Director), 1 November 2026. Card `docs/board/cards/WATER-YARD-NEXT.md`,
part of The Water Road (`docs/story/wasteland-water-road.md`). A plain fix, no switch.

## What changed

- `src/screen-yard-home.js`: `yardNextStep(profile, {featureFlags})` reads the save
  and names the next step: the first warlord on the ladder not yet beaten, then
  either "is waiting. Open the TERRITORY MAP and press FIGHT." or how many more wins
  open the fight and where they count (the territory's roads by name, Scrapdome
  games against two or more cars for Kettle, and for the Tollkeeper Convoy Raids
  on the Salt Flats once the first Neon Docks win has started the hold, with
  "they open at rank 9" while closed). A finished career says every warlord is
  beaten. The yard
  home and CAREER panels both show it. With no warlord fights in the yard the old
  "Warlord fights are coming later." line stays.
- `tools/test-yard-next.mjs` (new, 7 cases): new career, half and nearly full hold,
  open fight, after Sal falls (no Sal line on either panel), Kettle and Tollkeeper
  routes with the rank note, the Baron and a finished career, the save is never
  changed by reading, and the coming-later line.

## Checks

- `node --test tools/test-yard-next.mjs`: 7 of 7 pass.
- Lane tier (`--tier lane --changed --jobs 4`): 28 passed, 0 failed, 0 not run,
  including test-arena-ui, test-warlord-format, test-warlord-gunn, replays and
  world composition.
- `npm run build`: passes.
- No save change, no race rule change.

## Review

One independent review found two real faults, both fixed: the line named Convoy
Raids before the yard offers them (they need Tollkeeper hold above 0), and
Kettle's line named only Last Car Rolling although every Scrapdome game but the
Convoy Raid adds his hold. It also found an unused branch for the Baron, now one
plain "coming later" line. The four suites that read the yard reran after the fixes.

## Changed assertions

None.

## Removed

The fixed lines "Sal is waiting on the territory map." and "Fill Sal's territory
hold to fight her from the map." in `src/screen-yard-home.js`.
