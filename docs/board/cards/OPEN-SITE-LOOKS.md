# OPEN-SITE-LOOKS

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (graphics). Cut by Claude on 27 November 2026 from the laptop run of `open-radio-hill-voice`: at
the top of the climb Radio Hill is a pole and a box.

## Why

Radio Hill (`src/world/open/looks/radio-hill-look.js`, round 1 passed by day) and the Bus Ring
(`src/world/open/looks/bus-ring-look.js`, passed and done) are drawn in code and stand in the QA stand, but in play
`src/world/open/site-view.js` still draws them with its own stand-ins (`radioHillLook`, `busRingLook`). Only the
Glasshouse's drawn look reaches the game.

## What to build

1. `siteLook` builds Radio Hill and the Bus Ring from their drawn looks (`buildRadioHill`, `buildBusRing`, with their
   update functions each frame), at every stage they have, as the Glasshouse's is built. Remove the stand-ins.
2. The rules read each look's solids and spots (`radioHillSolids`, `busRingSolids`, the layouts' spots) through a
   plain-data copy held equal to the look by a test, as `src/world/open/site-rule.js` does for the Glasshouse, so a
   walker reaches Radio Hill's set through its door (round 1's recorded choice) and the Market reads the Bus Ring's
   spots (Claude's answer of 19:10, 26 November).
3. Clear the land's scatter (bushes, rocks) inside each site's radius, as the look rounds asked.
4. Keep both looks inside their budgets in play.
5. Check the Rats' Nest the same way: if no play path builds `buildRatsNest`, build it in play as well (its cut ground already is).

## Files and locks

`src/world/open/site-view.js`, `src/world/open/site-rule.js`, `tools/test-open-sites.mjs`. No lock.

## Checks

`tools/test-open-sites.mjs` (the drawn look is the one built in play; solids and spots match the look),
`test-radio-hill-look`, `test-bus-ring-look`, `test-open-market-day`, `test-open-radio-hill-voice`, then rule 23's set
and `npm run build`. Laptop: Claude runs `open-radio-hill-voice` and `open-market-day` and looks at their pictures.

## Rules

Behind `story-choices`. Memory-only saves. Questions go to `docs/board/questions/OPEN-SITE-LOOKS.md` with your pick.
Write `docs/changes/OPEN-SITE-LOOKS.md` with a **Removed** line. After the pull request is open the card is finished.
