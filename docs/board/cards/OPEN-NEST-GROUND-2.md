# OPEN-NEST-GROUND-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (graphics and physics). Cut by Claude on 26 November 2026 from the independent review of
OPEN-NEST-GROUND at its merge. Nothing in it held that merge; each item matters once a job can end in the Nest.

## What to build

1. **The cut stays until the arena is left, not until the job ends.** `finish()` in `src/arena/arena-event.js` takes
   the site's ground away while the frozen scene still draws behind the results screen, so a car or walker standing
   in the Nest is shown buried up to 9 m deep behind "JOB COMPLETE". Take the ground away on leaving the arena (and
   on return to the menu, as now). OPEN-BURNED-SCOUT and OPEN-BURNED-PEN end jobs in the Nest.
2. **No crack at the squares' edges.** Inside a site square the near ground is pressed to the floor, but at the
   square's outer edge the edit mesh follows the land at 1 m grain while the near ground outside follows straight
   slopes across 23 by 17 m cells (`src/world/near-ground.js` near lines 70 and 93). On a curved dune a thin crack can
   open along the 32 m edge. Close it (a skirt on the edit mesh at the edge, or the near ground's edge cells taking
   the edit mesh's heights) and show it from a low view in the stand.
3. **Work orders inside a site square are measured from the land, not the cut.** During an open job a machine's cut
   or fill inside the Nest's squares is stored relative to the cut floor (`src/world/ground-edit.js` near lines 132
   and 148), and is reapplied to the natural land after the job, leaving a pit or a mound out on the land, and saved
   that way. Store it against the land's own height, or refuse ground work inside a site square while the site is
   installed; say which in the change note.
4. **No string made per height query.** While a site is installed, every physics height query anywhere adds a string
   key (`hasChunkAt`, near line 85), and more inside the squares. Use a numeric key or a small grid.
5. Nits: drawn feet lift 0.025 m but the edit mesh and `drawnGroundHeightAt` use 0.035 m, so feet sink 1 cm into the
   cut (`src/world/scablands-drawn-feet.js` line 51); the cut cells at a square's edge are lit as separate faces
   beside smooth cells. The bounding-volume reset in `near-ground.js` (line 184) is a real fix and stays.

Also: `tools/test-scablands-drawn-feet.mjs` failed its 0.15 ms limit under load in the cloud lane and again on the
laptop at the merge, and passed alone both times. If item 4 is the cause, say so; otherwise leave it to the night.

## Files and locks

`src/arena/arena-event.js` (the cleanup's moment only), `src/world/near-ground.js`, `src/world/ground-edit.js`,
`src/world/open/site-ground.js`, `src/world/scablands-drawn-feet.js`, `tools/open-look-stand.js`,
`tools/test-site-ground.mjs`. No lock.

## Checks

1. `tools/test-site-ground.mjs` extended: the ground is still cut after `finish()` and gone after leaving the arena;
   along every edge of the 18 squares the drawn edge and the near ground meet within 0.05 m; a work order made inside
   a square during a job leaves the land unchanged after the job (or is refused); no allocation per height query.
2. Every older suite that names `near-ground`, `ground-edit` or `scablands-ground`, and the world-composition guard,
   which must not move.
3. The scenario `look-rats-nest`, with one low view along a square's edge.

Not rule 23 alone: it touches how the land's ground is drawn and stood on. The checks above, the lane tier
(`node tools/run-tests.mjs --tier lane --changed --jobs 4`), `npm run build`, and one independent review before the
merge.

## Sound cues

None.

## Rules

Behind `story-choices`; with it off or with no job in the open, the land is drawn and stood on exactly as today, and
the replay and world guards must not move. Checks use memory-only saves. Questions go to
`docs/board/questions/OPEN-NEST-GROUND-2.md` with your pick. Write `docs/changes/OPEN-NEST-GROUND-2.md` with a
**Removed** line. After the pull request is open the card is finished: do not wait for review comments.
