# WW-BOSS

## Changed

- Kept the deterministic, three-second Old Smoke vent cycle and its active-only
  damage rules. No job timing, path, health, difficulty or save data changed.
- In the Scablands scene, made the existing 1.5x furnace scale and chimney and
  door effects line up with the model's placement and rotation. Chimney smoke
  drifts, door flames flicker, and each named vent insert follows the same
  `oldSmokeGlowingVent` clock used by the hit rules.
- The scene sync reads world-job state only; its animation changes presentation
  objects only.

## Checks

- `node tools/test-old-smoke.mjs` - passed; deterministic cycle, active-only
  damage, hit-target integration and three-hit finish.
- `node tools/test-scablands-scene.mjs` - passed; furnace scale, live vent
  glow, smoke and flame placement and presentation motion.
- `node tools/test-everburn-easy.mjs` - passed; all nine Everburn jobs finished
  10/10 on Easy with real headless Duel inputs.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going` -
  passed: 41 suites, 0 failed, 0 not run. Replay fingerprints: 297 checks
  passed across 33 cases, 31 events, 9 categories, three FPS values and three
  runs.
- `npm.cmd run build` - passed. Vite reported its dynamic-import and large-chunk
  warnings.
- Browser and look checks - Claude runs. Please inspect Everburn Job 6 while
  Old Smoke is chased: furnace size against the other vehicles, each vent glow
  switching with the live hit window, smoke rising from the chimney, and fire
  at the furnace door. Also judge Big Bess, the furnace and the thief buggy in
  game against the Round 3 verdict as WW-FINISH requests. This is a follow-up,
  not a new art round.

## Changed assertions

- Added scene assertions for the furnace scale, the rule-matched visible vent,
  chimney and door effect placement, and smoke motion. No existing assertion or
  tolerance changed.

## Race fingerprints

- The lane replay fingerprint suite passed unchanged. This work changes scene
  presentation only; the Old Smoke rule implementation remains deterministic.

## Removed

- None.
