# OPEN-NEST-GROUND

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (Kyle, 20 November 2026: Astra builds graphics and physics). Cut on 25 November 2026 from the
Rats' Nest's round 1 (OPEN-LOOK-RATS-NEST, its question 2).

## Why

`ratsNestGround(x, z)` in `src/world/open/looks/rats-nest-look.js` says how deep the cutting is at each point: 90 m by
45 m, 9 m deep, with a ramp, a gully and a hollow for the car. The land's near ground is drawn in cells of about 23 by
17 m (`src/world/near-ground.js`) and the coarse ground in larger ones, so a cut that deep with steep sides shows the
land's red dunes standing across its floor, as the Dig's yard once did. The QA page's stand hides this for pictures by
drawing 80 squares of ground at 1 m grain. That is not fit for play, and OPEN-BURNED-SCOUT needs the player to drive
down the ramp and walk the rim.

## What to build

The way a site cuts its own ground into the land, for play, by the method the Dig's yard uses: the near and coarse
grounds stay below the edit layer inside every 32 m square the site touches, and the edit layer draws the cut.

1. **A site with ground of its own** cuts it into the land's edit layer (`src/world/ground-edit.js`) once, when a job
   in the open begins, and the car and a walker stand on the cut ground (the physics read the same layer).
2. **The near and coarse grounds** are kept under the edit layer in those squares, so that nothing stands in the cut.
3. **Only in the open.** With no job in the open, or with `story-choices` off, the land is drawn exactly as today.
4. **The QA page's stand** uses the same way in, and its own sinking of the near ground goes.

Name the one place where a site says it has ground (`ground` beside `build` in the stand's table today), so that the
Glasshouse and later sites need no new hook.

## Files and locks

`src/world/near-ground.js` and the coarse ground's file (find it from `src/world/scablands-scene.js`), the edit layer
in `src/world/ground-edit.js`, a new `src/world/open/site-ground.js`, `tools/open-look-stand.js`,
`tools/test-site-ground.mjs`. Hook: where the open land's view is made in `src/world/scablands-scene.js` (marked
OPEN-SHARED). No lock.

## Checks

1. `tools/test-site-ground.mjs`, with no graphics: in a job in the open, the height the physics read at the cutting's
   floor, ramp, rim and gully matches `ratsNestGround` within 0.2 m; with no job in the open it is the land's own height
   everywhere; nothing in `src/world/near-ground.js` stands above the cut's floor inside it.
2. Every older suite that names `near-ground`, `ground-edit` or `scablands-ground`, and the world-composition guard,
   which must not move.
3. The scenario `look-rats-nest`, run as before. The pictures must look as round 1's did, now without the stand's own
   sinking.

Not rule 23 alone: this card touches how the land's ground is drawn and stood on. The checks above, the lane tier
(`node tools/run-tests.mjs --tier lane --changed --jobs 4`), `npm run build`, and one independent review of the change
to the land's ground before the merge.

## Sound cues

None.

## Rules for every open Scablands card

Design: [docs/story/open-scablands.md](../../story/open-scablands.md), sections 16 and 21. Everything is behind
`story-choices`, and nothing the released game does with that switch off may change; the replay and world guards must
not move. Stay inside the files named here. If another file is needed, write the choice under "Codex decided (Claude
to review)" and carry on, unless it touches saves or a released course; then stop and say so. Checks use memory-only
saves. Write `docs/changes/OPEN-NEST-GROUND.md` with a **Removed** line. After the pull request is open the card is
finished: do not wait for review comments.
