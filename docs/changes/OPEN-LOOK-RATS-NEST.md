# OPEN-LOOK-RATS-NEST: the Rats' Nest drawn in code, round 1

Claude (cloud session), 26 November 2026. Nothing in the game loads the look yet: no switch, save, pay or released behaviour moves.

- **What changed.** New `src/world/open/looks/rats-nest-look.js`: `ratsNestGround` (the cutting, its road, the gully, the car's hollow), `RATS_NEST_LAYOUT` (radius 95 m, 27 named spots), `ratsNestSolids` (58), `buildRatsNest` for `day` and `night`, `updateRatsNest`. New `tools/test-rats-nest-look.mjs` and `tools/scenarios/look-rats-nest.mjs`.
- **Cost.** Day: 10 draws, 49,376 triangles. Night: 11 draws, 49,442 triangles and 6 point lights. The budget is 12 draws and 60,000 triangles.
- **Outside the card's files (Cloud decided, Claude to review; `docs/board/questions/OPEN-LOOK-RATS-NEST.md`).** `tools/open-look-stand.js` and five lines in `tools/menu-check.js`, the QA page only, behind `story-choices`; one row in `SCENARIO_AREAS` in `tools/run-browser-scenarios.mjs`; a block in `docs/ART_LINE.md` (rule 21).
- **Checks, all on `80bd1eff1`.** Rule 23's set, `node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-rats-nest-look`: 5 passed, 0 failed. `npm run build`: built. `tools/test-browser-scenarios.mjs` (17 passed), `tools/test-browser-harness.mjs` (19), `tools/test-qa-storage.mjs`, `tools/test-board.mjs`, `tools/test-repo-hygiene.mjs`: passed. Later commits change only docs and the board.
- **The scenario** `look-rats-nest` ran in the cloud container under software rendering, on Performance: passed, 7 pictures, 0 warnings, 0 errors. Claude has not taken the pictures on the laptop and there is no verdict.
- **Changed assertions:** none. **Race fingerprints:** unchanged (both replay guards pass).
- **Not run:** a frame check (rule 9), and the night's wide suites (rule 23).
- **Removed:** nothing. This card replaces nothing.
