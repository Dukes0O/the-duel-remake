# WW-SCENE

The short board entry controls current state, ownership, dependencies and locks.

`src/world/scablands-scene.js`: ground chunks with coarser far detail, placed art by the place table, collision for solids, the mast and smoke seen from anywhere. Only the near place in full detail. Salt Flats' scene is the pattern; no change to it.

**Checks:** a headless test that every solid has collision matching the place table. Claude runs: looks and the frame check (18.5 ms at the busiest view with eight cars, rule 8).

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-SCENE.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Art notes to carry out here (Claude)

The art merged at the three-round cap with fixes left for this card. Read the last "Round 3" verdict on `docs/board/cards/WW-ART-MALL.md` and `docs/board/cards/WW-ART-VEHICLES.md` and do those fixes here, as materials, placement or the look of props. They are not new art rounds.
