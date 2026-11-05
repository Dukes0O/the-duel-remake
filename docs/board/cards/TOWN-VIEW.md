# TOWN-VIEW

The short board entry controls current state, ownership, dependencies and locks.

`src/town/view/town-scene.js`, `town-camera.js`, `town-instances.js`, `town-pick.js`. Section 10's camera, continuous zoom from street to Scablands height. Uses the Scablands ground and distant detail from WW-SCENE. Reads town state only. Draws roads as a ground layer, painted zones, buildings per node with instancing from `public/assets/models/wasteland/town/*.glb`, the Dome. Until a family's art lands, its buildings draw as a plain box of their footprint: list which families are still boxes in the change note, and TOWN-VIEW-ART removes the boxes. Green and red placement ghost; picking a cell, building or person from the mouse. At most 150 draw calls for a full town. Day and night from the town's clock with lamps coming on (`:lamp` parts). `tools/test-town-view.mjs` for what can run without a browser (instance lists, node lookup, picking maths).

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
