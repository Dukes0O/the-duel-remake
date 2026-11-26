# OPEN-LOOK-GLASSHOUSE

- **What changed.** New `src/world/open/looks/glasshouse-look.js`: the Glasshouse drawn in code at three stages (camp;
  burned and fresh; burned and cold). It gives `GLASSHOUSE_LAYOUT`, `glasshouseSolids(stage)`,
  `buildGlasshouse({stage, fresh, heightAt})`, `updateGlasshouse(group, seconds, {sun})` and `glasshouseGlint`.
  Nothing in the game loads it yet (OPEN-SITES will), so the released game is unchanged. Behind `story-choices`.
- **Size.** Camp 12 draws and 36,799 triangles; burned and fresh 8 and 41,696; burned and cold 8 and 31,328
  (budget 12 and 60,000). 51 screens of four makes. No image files.
- **Checks, on commit 5c51632d6** (the branch with `integration/wasteland` of 26 November merged in):
  `tools/test-glasshouse-look.mjs` passes; rule 23's set (`core`, `test-replays`, `test-combat-replays`,
  `test-world-composition`, `test-glasshouse-look`) 5 passed, 0 failed; `npm run build` passes.
- **For Claude to run on the laptop.** `node tools/run-browser-scenarios.mjs --scenarios look-glasshouse`. It takes
  `look-glasshouse-` `camp-far`, `camp-edge`, `camp-rows`, `camp-pump`, `burned-far`, `burned-edge`, `burned-rows`,
  `burned-pump`, `burned-clues`, and two extras, `camp-glint` and `cold-clues`.
- **Nobody has reviewed the look, and nobody has seen it on the laptop.** The cloud's container had a browser, so the
  scenario was run there in the real game with software drawing and passed (11 pictures, no warnings, 12 and 8 draws
  measured in the page). The cloud session looked at those pictures; that is not the look review.
- **Changed assertions.** None. **Sound cues.** None. Questions and picks: `docs/board/questions/OPEN-LOOK-GLASSHOUSE.md`.
- **Removed:** nothing; the file is new and replaces nothing.
