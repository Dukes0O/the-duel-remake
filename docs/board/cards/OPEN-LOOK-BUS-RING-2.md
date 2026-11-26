# OPEN-LOOK-BUS-RING-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (graphics; on the Codex command line `gpt-6-astra`). Cut by Claude on 26 November 2026 from the
Bus Ring's round 1 verdict. Kyle, 25 November: further rounds go to Codex.

## What to build

Round 2 of the Bus Ring. Read [the round 1 verdict](../looks/open-bus-ring/round-1-review.md) first: the yard, the table,
night and the gate pass and must stay.

1. **The buses are buses.** Rounded roofs, a raked front with a windscreen, headlamp and bumper, wheel arches, a folding
   door, some on blocks with wheels gone, some panels missing so the frame shows. Keep their rust and paint, their
   footprints and solids. Use the hull kit (`tools/blender/hull_model.py`, `docs/ART_LINE.md`) or shape them in code;
   no plain boxes.
2. **The far view reads.** From the Ridge spur at 690 m, at dusk, the welding flicker and a stove smoke taller than the
   haze can be seen. Say in the change note how far each reads.
3. **The near view.** `near` shows empty salt; measure where its camera stands and what it looks at, and mend the
   scenario (or the spot) so it shows the ring from the approach.

Keep the layout, spots and solids (OPEN-T-MARKET reads them). Stay inside 12 draws and 60,000 triangles a stage.

## Files and locks

`src/world/open/looks/bus-ring-look.js`, `tools/test-bus-ring-look.mjs`, `tools/scenarios/look-bus-ring.mjs`, and a hull
recipe under `tools/blender/` with its output if item 1 needs one. No lock.

## Checks

`tools/test-bus-ring-look.mjs` (budget, layout and spots unchanged, solids inside the radius); run `look-bus-ring` where
you can, look at the pictures and mend what they show, and say whether Claude has looked; one sheet
`docs/board/looks/open-bus-ring/round-2.jpg` (500 KB at most) replacing `round-1.jpg`. Rule 23:
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-bus-ring-look`
and `npm run build`. Claude takes the pictures on the laptop and writes the verdict at the merge.

## Rules

Behind `story-choices`; nothing the released game does with it off may change. Memory-only saves. Questions go to
`docs/board/questions/OPEN-LOOK-BUS-RING-2.md` with your pick. Write `docs/changes/OPEN-LOOK-BUS-RING-2.md` with a
**Removed** line. After the pull request is open the card is finished.
