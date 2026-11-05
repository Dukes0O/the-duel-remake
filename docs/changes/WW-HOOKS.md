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
- Added a real-Duel check for leaving and re-entering the car, firing a loaned
  weapon, settlement and saved-loadout cleanup.

## Checks

- `node tools/test-world-job-mode.mjs` — passed before the Everburn follow-up;
  rerun requested checks in this lane.
- `node tools/test-everburn-easy.mjs` — passes 10/10 for all nine jobs; see
  `docs/changes/WW-EVERBURN-JOBS.md` for the finale path.
- Browser and look checks — Claude runs. Check one job from start to finish,
  including captions, marker, raider wave, following target, visible actor and
  loaned weapon.

## Assertions and fingerprints

- No existing assertion changed. The new mode test adds assertions for this
  card's behavior.
- No replay fingerprints changed. Other arena modes keep their existing
  simulation paths; the new rules run only for `world-job`.

## Removed

- None.

## Review follow-up still needed

- One independent code review and the requested focused checks and build remain
  before handoff.
- Claude's browser and look checks remain.
