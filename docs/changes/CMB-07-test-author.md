# CMB-07 independent acceptance tests

Status: ready for the combat builder. This branch adds tests only. Projectile
carry and aim are still pending.

## Contract

- `tools/test-combat-projectiles.mjs` fires real weapons in a seeded
  three-opponent race. Bombs and bolts must inherit the player's or a later
  CPU car's world velocity, including reverse travel and lateral shove.
- A player bolt and a later CPU bolt must aim ahead of a target moving across
  the road. A flying bolt may correct course toward a moved target. It may
  turn no faster than 90 degrees per second and may travel no more than 12
  degrees away from its launch path. Bombs keep their launch direction.
- A fast bolt must hit a later CPU car when its path crosses the car at 30,
  60, and 144 FPS. It must raise one hit event and leave the projectile pool.
- The test pins short seeded replay hashes from integration `2c88cf1` for an
  ordinary race and a flag-off Wasteland race. The approved full replay suite
  remains the wider isolation gate.

The 12-degree cone and 90-degree-per-second turn cap are provisional tuning
decisions from the Director. The spec says only a small homing cone. Balance
work may change these numbers with a reviewed test change.

## Red baseline at integration `2c88cf1`

- `node --check tools/test-combat-projectiles.mjs`: passed.
- `git diff --check`: passed.
- `node tools/run-tests.mjs --list`: discovers the new test file.
- `node tools/test-combat-projectiles.mjs`: 7 tests, 3 pass, 4 fail as expected.
  The failures are missing player bolt carry, missing later-CPU bolt carry,
  no player lead, and no in-flight bolt turn. Bomb carry, bomb straight-line
  travel, swept contact at all three frame rates, and the pinned replay
  controls pass. The flag-off hash is
  `9453a92c428b5194f5768392e2d1e76a0162de6f36429c39bd18bd02fc3bfd34`;
  the ordinary hash is
  `1a7f0be659d29472a1ce36f2903dffdff8352f2b951c16a75df9bb7a7414c14e`.
- No existing assertion, production source, replay fixture, or expected
  fingerprint changed. The test worktree uses an ignored junction to the
  integration worktree's existing `node_modules`; no packages were installed.

## Builder and verification handoff

Implement behind the `wasteland2` feature switch. Preserve first-rival
events and the ordinary and flag-off Wasteland path. The current CPU bolt
already predicts target motion; extend aim to player shots and later CPU
shots without reintroducing a one-rival target. Keep physical velocity carry
separate from the bounded aim direction so each can be checked. The combat
builder must run this file, the approved `tools/test-replays.mjs` suite,
the lane gate, production build, and focused browser combat before handoff.
The full replay fingerprints may change only for the flag-on feature.

The lane, merge, full, build, and browser gates were not run in this test-only
branch while the CMB-01 builder's checks were active.
