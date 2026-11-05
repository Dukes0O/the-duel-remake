# WW-BOSS

## Changed

- Added `src/world/jobs/old-smoke.js` for Old Smoke's deterministic three-vent
  cycle. One vent is damageable for each three-second window, in order, then
  the cycle repeats. The existing chase health ends the fight after three
  valid hits.
- Connected the active vent targets to the world-job combat hit list. Dark
  vents remain targets for aiming but carry zero damage.
- Did not change job path, speed, health, difficulty numbers, or any saved data.

## Checks

- `node tools/test-old-smoke.mjs` - passed; cycle order, target positions,
  active-only damage, live hit-target integration, and three-hit completion.
- `node tools/test-everburn-easy.mjs` - passed; all nine jobs, including the
  Everburn finale, finished 10/10 on Easy with real headless Duel inputs.
- `npm run build` - PowerShell blocked the `npm.ps1` wrapper before the build
  started. `npm.cmd run build` passed. Vite reported its existing large-chunk
  and dynamic-import warnings.
- Lane tier - not run, as instructed for this lane.
- Browser and look checks - Claude runs. Please inspect the furnace in the
  chase for the requested 1.5x scale, sequential visible vent glow, chimney
  smoke, and fire at its doors. The card's unshared simulation hook owns this
  lane; the renderer is a shared locked file and was not changed here, so these
  art fixes are not yet visible in-game.

## Changed assertions

- Added focused assertions in `tools/test-old-smoke.mjs`. No existing test
  assertion or tolerance changed.

## Race fingerprints

- No replay fingerprint test was run for this card. The new rules only apply
  to the existing Wasteland world-job furnace actor.

## Removed

- None.
