# WW-BOSS

## Changed

- Kept the deterministic, three-second Old Smoke vent cycle and its active-only
  damage rules. No job timing, path, health, difficulty or save data changed.
- Made the authored 1.5x furnace rig follow Old Smoke's moving actor position
  and heading during the chase. While the chase is inactive it stands at its
  original Everburn location. The actor no longer requests an ordinary Titan
  Monster truck render.
- Parented the named vents, chimney smoke and door flames to the furnace rig.
  Smoke drifts, flames flicker and the named vent glow still follows the same
  `oldSmokeGlowingVent` clock used by the hit rules. The scene reads job state;
  its updates change presentation objects only.

## Checks

- `node tools/test-old-smoke.mjs` - passed; deterministic cycle, active-only
  damage, hit-target integration and three-hit finish.
- `node tools/test-scablands-scene.mjs` - passed; furnace scale, live vent
  glow, 100 m actor-follow position and heading, no ordinary car, static
  inactive placement, smoke and flame placement and presentation motion.
- `node tools/test-everburn-easy.mjs` - passed; all nine Everburn jobs finished
  10/10 on Easy with real headless Duel inputs.
- Lane tier was not rerun for this follow-up; Claude runs it. The previous
  lane-tier pass predates these changes. Its recorded replay fingerprints were
  297 checks across 33 cases, 31 events, 9 categories, three FPS values and
  three runs.
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
  chimney and door effect placement, smoke motion, position and heading after
  a 100 m actor move, static inactive placement, and the lack of a car render.
  No existing assertion or tolerance changed.

## Race fingerprints

- The lane replay fingerprint suite passed unchanged. This work changes scene
  presentation only; the Old Smoke rule implementation remains deterministic.

## Removed

- None.
