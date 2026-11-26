# OPEN-DOORS-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra.** Cut on 25 November 2026 from [Claude's round 1 verdict](../looks/open-doors/round-1-review.md).

## What to build

1. **The forge shed's furniture,** drawn in code and never as plain boxes: an anvil with its horn on a stump, a bench
   covered in tools and offcuts, gas bottles chained to the wall, a hood over a small hearth with a glow, grit and scale
   on the floor. Moss's shed the same way for washing: buckets, a hose, brushes, a drain in the floor.
2. **The light:** dark inside, one warm glow at the hearth, and a bright doorway.
3. **No weapon prompt inside a building** for a weapon that cannot be used there.

Keep the rooms' sizes, spots, solids and the camera as they are.

## Files and locks

`src/world/open/building-view.js`, `src/world/open/content/buildings.js` (things only), the prompt's check in the HUD
where it reads the open land's `inside`, `tools/test-open-doors.mjs`, `tools/scenarios/open-forge-shed.mjs`. No lock.

## Checks

`tools/test-open-doors.mjs`; the scenario `open-forge-shed`, with one picture in each shed, by day and after dark, on a
sheet `docs/board/looks/open-doors/round-2.jpg` replacing `round-1.jpg`. Rule 23:
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-open-doors`
and `npm run build`.

## Rules

Everything is behind `story-choices`. Stay inside the files named here. Questions go to
`docs/board/questions/OPEN-DOORS-2.md` with your pick. Write `docs/changes/OPEN-DOORS-2.md` with a **Removed** line.
After the pull request is open the card is finished: do not wait for review comments.
