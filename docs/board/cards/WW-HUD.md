# WW-HUD

The short board entry controls current state, ownership, dependencies and locks.

One line for what to do now, compass arrow, marker, and M for the map (`src/deep/deep-chart.js` and the pilot's map as patterns, drawn from the place table). Finds tick off. Reads state, never changes it.

**Checks:** `tools/test-world-hud.mjs`: the line and arrow are right for each step kind. Claude runs: look.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-HUD.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
