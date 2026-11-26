# OPEN-FIGURES-4

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra.** Cut on 25 November 2026 from [Claude's round 3 verdict](../looks/open-people/round-3-review.md).

## What to build

Three things only; everything else on the round 3 sheet passes and must stay.

1. **Odessa's apron and gloves.** A leather apron that hangs from a neck strap, narrows at the waist where it is tied,
   and creases; welding gloves with long cuffs and fingers. Her build, cap and stance stay.
2. **Sleep.** Every sleeper lies on one side with the knees drawn up, or sits with the back against something drawn.
   No limb in the air.
3. **Hetty's headphones,** large enough to be seen round her neck on the sheet.

## Files and locks

`tools/blender/open-figures.py`, `tools/blender/open-figures-2.py`, the two models they make, the sleep pose in
`src/world/story-people-view.js`, `tools/art/story-people-poses.mjs`, `tools/test-story-people.mjs`. No lock.

## Checks

`tools/test-story-people.mjs`; one sheet `docs/board/looks/open-people/round-4.jpg` (500 KB at most) replacing
`round-3.jpg`; `tools/test-blender-output.mjs` (a heavy job). Rule 23:
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-story-people`
and `npm run build`.

## Rules

Everything is behind `story-choices`. Stay inside the files named here. Questions go to
`docs/board/questions/OPEN-FIGURES-4.md` with your pick. Write `docs/changes/OPEN-FIGURES-4.md` with a **Removed**
line. After the pull request is open the card is finished: do not wait for review comments.
