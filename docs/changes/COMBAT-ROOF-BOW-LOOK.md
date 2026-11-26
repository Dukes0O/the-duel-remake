# COMBAT-ROOF-BOW-LOOK: the roof crossbow, and the town road from the cab

**Changed.** New `src/combat-roof-bow.js` draws the roof bow of every fighting car (`combat-bow-N`, still on the roof socket): a crossbow on a welded rack, one lit mesh per car with the scrap wear, 2,080 triangles. It is scaled to the car's width, its feet are seated on the car's own roof (read from the model once per car, 20 to 100 ms), and its point stays 6 cm behind the windscreen's top edge. `src/combat-scene.js` builds, seats and wears it. The town's roads were flat boxes floating up to 1.9 m (near-black underside from the cab); `createStripRoadsDraw` in `src/world/scablands-draw.js` lays them on the drawn ground with the land roads' look, used by `src/world/scablands-scene.js`. No switch: a drawing fix of released looks; no rule, save or pay change. Lessons in `docs/ART_LINE.md`.

**Look.** `docs/board/looks/combat-roof-bow/round-1.jpg` and its review, from the new `combat-roof-bow-look` scenario in the cloud (SwiftShader). Claude has not looked yet.

**Checks** (cloud, on `942fb15`, integration `cee3d28` merged in): lane tier `--keep-going` 64 of 66 passed; `test-full-check` needs Windows (`pwsh`, laptop-only), `test-scablands-map` failed a slice-time limit under load (42 ms) and passed on its rerun alone (rule 3; worth a small card). `test-vehicle-sockets`, `test-scablands-scene`, `test-board`, `test-repo-hygiene`, `npm run build` pass; scenarios `combat-roof-bow-look` and `combat-field` pass. Not runnable here: `vehicle-socket-poses` and `town-world` time out the same way on unchanged `cee3d28`; the night's long suites the tier left (`test-arena-shove`, `test-convoy-tanker-art`, `test-field-battle`, `test-first-person-cloth`, `test-first-person-polish`, `test-old-smoke`).

**Changed assertions.** None changed; added to `test-vehicle-sockets.mjs` (every car: feet on the roof, point behind the windscreen, span 0.5 to 0.75 of the width) and `test-scablands-scene.mjs` (town roads on the drawn ground, facing up, whole between their ends). Race fingerprints untouched (drawing only).

**For Claude to run.** The look on the laptop (`node tools/browser-harness.mjs scenario combat-roof-bow-look`), a chase drive with the bow, and a town drive in a truck.

**Removed.** The old rail, arms and cream cone of the roof bow, and the town roads' flat boxes and their material.
