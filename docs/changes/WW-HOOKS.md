# WW-HOOKS

## Changed

- Added the `world-job` arena mode and its headless job runner. It steps the
  shared job engine, sends wave requests through raiders, sends follow requests
  through the arena pilot, and shows captions through callouts.
- Added the mode to the car-exit rules and kept `state.objective` inactive.
- Added run-only car-weapon lending. It restores the original loadout on win,
  failure, menu quit and paused exit.
- Connected job actors to the renderer's vehicle asset path and job hits to
  the existing projectile and flame contact paths.
- Added a real-Duel check for leaving and re-entering the car, firing a loaned
  weapon, settlement and saved-loadout cleanup.

## Checks

- `node tools/test-world-job-mode.mjs` — passed.
- `node tools/test-everburn-easy.mjs` — acceptance is not complete; the finale
  design question and current evidence are in
  `docs/board/cards/WW-EVERBURN-JOBS.md`.
- Lane tier and build — not run after the final source changes because the
  dependent world-job Easy proof is unresolved.
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

- One independent code review, lane tier and build remain before handoff.
- Claude's browser and look checks remain. The dependent Easy proof is not
  complete; see `WW-EVERBURN-JOBS`.
