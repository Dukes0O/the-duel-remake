# OPEN-MAP-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra.** Cut on 25 November 2026 from [Claude's round 1 verdict](../looks/open-map/round-1-review.md).

## What to build

1. **Driven ground reads as known land.** Driven squares show the map's full colours, clearly richer than the pale wash
   round them, with soft edges (a blur or a feather of about a fifth of a square) so the 500 m squares never show as
   blocks. Ground never driven keeps its wash, with the hills showing.
2. **A found site has a place mark,** smaller than the eight places' marks, where its name stands, on both maps.

Everything else on the sheet passes and stays. Only in a job begun in the open.

## Files and locks

`src/world/scablands-map.js`, `tools/test-open-map.mjs`, `tools/scenarios/open-map.mjs`. No lock.

## Checks

`tools/test-open-map.mjs` and every older suite that names `scablands-map`; the scenario `open-map`, whose sheet
`docs/board/looks/open-map/round-2.jpg` replaces `round-1.jpg`. Rule 23:
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-open-map --filter test-scablands-map`
and `npm run build`.

## Rules

Everything is behind `story-choices`, and every map in any other job is drawn as today. Stay inside the files named
here. Questions go to `docs/board/questions/OPEN-MAP-2.md` with your pick. Write `docs/changes/OPEN-MAP-2.md` with a
**Removed** line. After the pull request is open the card is finished: do not wait for review comments.
