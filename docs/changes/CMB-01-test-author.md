# CMB-01 independent acceptance tests

Status: ready for the CMB builder. This commit contains tests and a browser
scenario only; it does not implement armor.

## Contracts and cases

- `tools/test-combat-armor.mjs` checks the `wasteland2` dev switch, flag-off
  isolation, all nine car masses and both armor clamps, the complete damage
  table, upgrade scaling, independent three-car armor, bolts, bomb falloff,
  physical rams, major scenery, star immunity, bomb arming and self damage,
  one-time player and later-CPU wrecks, local recovery, 60% refill, and the
  ordinary crash rule.
- The pure module contract is `maxArmorForMass(mass)` and
  `armorDamageFor(source, {level, distanceFraction, relativeKph, spiked})` in
  `src/combat-armor.js`. Sources are `crossbow`, `bomb`, `rocket`,
  `rpg-direct`, `rpg-splash`, `ram`, and `scenery`. Rocket, RPG and spiked ram
  values are tested as pure values; their live weapons belong to later cards.
- Active combat actors expose numeric `armor` and `maxArmor`. Tests inject
  `new Duel({featureFlags: {wasteland2: true}})` and expect one `combatWreck`
  event per wreck with `victim`, finite `hitPosition`, and `opponentIndex` for
  CPU cars. The existing `state.rival` alias stays the first opponent.
- `tools/scenarios/combat-armor-wreck.mjs` runs in the private QA browser
  with memory-only saves and `?flags=wasteland2`. It captures player and
  second-CPU wreck shots and a ranked result in both High and Performance.
  The reviewer must inspect the shots for the reused explosion and recovery.

## Baseline evidence at 9fd42dd

- `node --check` passed for both new files.
- `node tools/test-combat-armor.mjs`: 14 tests, 11 expected red, 3 pass.
  The red cases are the absent switch and module, missing initialized armor
  and damage paths, absent arming delay, and absent wreck/recovery behavior.
  The positive controls are flag-off/ordinary state, legacy star immunity,
  and the ordinary crash slot.
- A temporary ignored `node_modules` junction points to integration's
  installed dependencies. No packages were installed.
- The browser scenario, lane/full gates, production build and replay suite
  were not run while the integration merge check was active.

## Decisions and follow-up

- A 3.5-second wreck is one recovery lock while race time advances. It does
  not add another 3.5 seconds to `racePenaltySec`.
- In flag-on armored Wasteland, a non-wrecking major scenery hit costs 20
  armor without spending an ordinary crash slot. The Director confirmed this
  reading because armor should make a hard hit survivable. Ordinary and
  flag-off modes keep their prior crash counts.
- A later-CPU Titan contact must use recoverable combat armor damage rather
  than the permanent crush shortcut. The same focused test keeps the flag-off
  Titan-versus-traffic crush rule intact.
- The active player wreck must display `WRECKED / RECOVERING`. A wreck blast
  must pan from its event `hitPosition`; older blasts without one continue to
  use their burst position. Both have focused flag-off/legacy controls.
- The existing HUD damage readout must show current and maximum armor at
  full strength, after a hit, at zero during recovery, and after the 60%
  refill. Flag-off Wasteland retains its old major-hit wording.
- A seeded Titan steep-face fixture drives at 60 Hz. Its first climb-limit
  incident costs 20 armor, continued contact for twelve frames cannot drain
  more, and a later separate incident can cost another 20. Flag-off still
  takes the established tumble path.
- Existing `tools/test-replays.mjs` must keep the pinned ordinary and
  flag-off Wasteland fingerprints unchanged. Run it after implementation,
  alongside the direct armor tests, combat tests, browser scenario, lane gate
  and build. No existing assertion was changed.
