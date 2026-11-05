# WW-SCREENS

The short board entry controls current state, ownership, dependencies and locks.

The Everburn on the Story Wall and STORY choice, the yard's BACK GATE and DRIVE THE SCABLANDS, Next up names the next job with one button, notice board side jobs, and results ticks. `src/story/ember-road.js`, `ember-ui.js`, as `water-road.js` and `water-ui.js`. Water Road's screens unchanged.

**Checks:** `tools/test-ember-screens.mjs` as `test-water-screens`, one button for each state. Claude runs: the scenario `tools/scenarios/everburn.mjs` that Codex writes but cannot run.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-SCREENS.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
