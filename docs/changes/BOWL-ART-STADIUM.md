# BOWL-ART-STADIUM

## Changed

- Added an original Blender recipe for the Bowl's dirt arena, concrete terraces, crowd rows, floodlight towers, ramp structures, named flame-jet parts, podium and scoreboard frame.
- Reused the rust, faded paint and dark steel palette from the Scrapdome yard and existing Wasteland assets. No art-library sources were used, so no new credit entry is needed.
- Added the recipe to `tools/test-blender-output.mjs` and checked its path plan, GLB header, file and triangle budgets, and required part names.
- Produced one first-round Blender contact sheet and review note. The GLB is generated for inspection but is not included in the commit because this card says it is not wired into the game.

## Checks

- Blender 4.5.13 recipe build and three renders: PASS. Final GLB is 2,721,576 bytes and 52,636 triangles; sheet is 39,511 bytes.
- Card-specific Blender output check: PASS; the lane output reports 193 checks and zero failures.
- Lane tier: all 48 selected suites printed `PASS`, including the Blender output suite. The outer runner did not exit or print its final summary, so its final shell status is unavailable.
- `npm run build`: PASS. Vite reported its existing dynamic import and large chunk warnings.
- Browser check: Claude runs; inspect `docs/board/looks/bowl-art-stadium/round-1.jpg` and the three source views under `.evidence/2026-11-04/bowl-art-stadium/round-1/`.
- No race simulation or gameplay code changed. Race fingerprints: not applicable.
- No existing test assertions changed; one output-budget and named-part assertion set was added.

## Removed

- Nothing replaced or removed.
