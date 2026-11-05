# WW-HOOKS

## Changed

- Added the `world-job` arena mode and its headless job runner. It steps the
  shared job engine, sends wave requests through raiders, sends follow requests
  through the arena pilot, and shows captions through callouts.
- Added the mode to the car-exit rules and kept `state.objective` inactive.
- Added run-only car-weapon lending. It restores the original loadout on win,
  failure, menu quit and paused exit.
- `src/app.js` starts world jobs through the normal arena-event path.
  `src/game.js` creates the run-only world-job state and restores its original
  loadout on settlement or exit.
- Connected job actors to renderer vehicle assets and job hits to existing
  projectile and flame contact paths. `src/render3d.js` uses the Titan as a
  stand-in for Old Smoke's furnace, the Falcone Heritage for Big Bess, and the
  Dusthawk Rally for the thief buggy until WW-ART-VEHICLES provides their
  models. WW-EVERBURN-JOBS adds a timber-and-iron crate stand-in for the supply
  crate planned in WW-ART-KIT.
- Fixed defend refills so they happen once at Hollis's crate between cleared
  waves, not while a wave is active. Raiders within 10 m now wear down the
  defended place; the well restarts the current wave when it falls, at a slower
  rate on Easy. Projectile and flame checks reuse the active world-job target
  list.
- Added a real-Duel check for leaving and re-entering the car, firing a loaned
  weapon, settlement and saved-loadout cleanup.
- Added real-mode checks for between-wave refills, in-wave resource stability,
  and the well-driven restart.

## Checks

- `node tools/test-everburn-easy.mjs` - all nine jobs passed 10/10 on Easy;
  see `docs/changes/WW-EVERBURN-JOBS.md` for the finale path.
- `node tools/test-world-job-mode.mjs` - passed, including refill and restart checks.
- `node tools/test-world-jobs.mjs` - passed, all step scenarios and repeatability.
- `node tools/test-replays.mjs` - passed, 297 exact replay checks. No world job
  ran during the replay check.
- `node tools/test-combat-replays.mjs` - passed, 12 checks.
- `npm.cmd run build` - passed.
- Lane tier - not run, as instructed for this lane.
- Browser and look checks - Claude runs. Check one job from start to finish,
  including captions, marker, raider wave, following target, visible actor and
  loaned weapon.

## Assertions and fingerprints

- No existing assertion changed. The real-mode test adds assertions for the
  fixes above.
- No replay fingerprints changed. Other arena modes keep their existing
  simulation paths; the new rules run only for `world-job`.

## Removed

- None.

## Review

- Fixed the three review findings on this branch. All requested checks pass;
  Easy finishes all nine jobs 10/10.
- Claude's browser and look checks remain.
