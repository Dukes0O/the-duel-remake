# OPEN-LOOK-RADIO-HILL-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (graphics; on the Codex command line `gpt-6-astra`). Cut by Claude on 26 November 2026 from Radio
Hill's round 1 verdict. Kyle, 25 November: further rounds go to Codex.

## What to build

Round 2 of Radio Hill. Read [the round 1 verdict](../looks/open-radio-hill/round-1-review.md) first: the day views pass
and must stay.

1. **Hetty's red lamp reads at night** as a red light at the top of the mast, with a small glow, seen from the roads the
   storyline uses (it gives the bearings). Say in the change note from how far it reads.
2. **The hut glows at night:** warm light through the door and the window, falling on the ground outside.
3. **The mast is the tell by day and at dusk** from 1,400 m: thin but findable against the sky (a light tip, a flag or
   the lamp lit at dusk).

Keep the layout, spots and solids. Stay inside 12 draws and 60,000 triangles a stage. Mind the lessons already in
`docs/ART_LINE.md` from round 1 (unlit things glow at night; judge colours by the pixels).

## Files and locks

`src/world/open/looks/radio-hill-look.js`, `tools/test-radio-hill-look.mjs`, `tools/scenarios/look-radio-hill.mjs`. No lock.

## Checks

`tools/test-radio-hill-look.mjs` (budget, layout and spots unchanged); run `look-radio-hill` where you can, look at the
night pictures and mend what they show, and say whether Claude has looked; one sheet
`docs/board/looks/open-radio-hill/round-2.jpg` (500 KB at most) replacing `round-1.jpg`. Rule 23:
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-radio-hill-look`
and `npm run build`. Claude takes the pictures on the laptop and writes the verdict at the merge.

## Rules

Behind `story-choices`; nothing the released game does with it off may change. Memory-only saves. Questions go to
`docs/board/questions/OPEN-LOOK-RADIO-HILL-2.md` with your pick. Write `docs/changes/OPEN-LOOK-RADIO-HILL-2.md` with a
**Removed** line. After the pull request is open the card is finished.
