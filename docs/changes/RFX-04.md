---
task: RFX-04
status: ready-to-merge
kind: combat-refactor
flag: none
player_facing: no
---

## Scope

`combat.js` now keeps only the public imports and the original fixed-step
update order. Weapons and UFO landing live in `combat-weapons.js`; hits,
explosions and projectile movement live in `combat-projectiles.js`; road
power-ups live in `combat-pickups.js`; CPU decisions live in `combat-ai.js`.
`wasteland-tuning.js` holds the weapon, CPU and gameplay balance numbers.

The combat simulation now reads every car in `state.opponents`. A UFO checks
the full field before landing. Bombs and bolts can hit later opponents, and
each hit counts. Every CPU car can attack and collect pickups. Extra opponents
own their shield, pickup charges, shield reaction timer and bomb impact
cooldown. The first opponent still uses the old `combat.rivalShield`,
`combat.cpuPickupCharges` and `combat.aiShieldCooldown` fields, keeping the
one-opponent event order and replay behavior.

The audio-facing `combatHit` event still includes `hitPosition`, `strength`,
`enemy` and `victim`. First-rival weapon, pickup and hit events keep their
previous shapes and order. Additional CPU bomb projectiles store a source
index instead of an actor reference, so projectile state remains serializable.
Bolts resolve against the first vehicle hit along their swept path, with the
opponent list order breaking exact ties.

Two narrow hooks complete independent shields across the field.
`sim-contacts.js` reads each additional opponent's own shield for physical
damage. The existing `combat-scene.js` rig now binds to the second and third
CPU meshes through the one-line `render3d.js` handoff. It shows each car's
own shield and retires the binding when that vehicle leaves the scene. The
first rival keeps its original scalar shield and attachment behavior.

## Acceptance and verification

The independent test author commit `a4316b2` was cherry-picked as `75b375b`.
No existing test assertion was changed. Both new files failed for the expected
reasons before implementation: five missing modules and seven multi-opponent
behaviors; the first-rival shield control passed.

| Check | Result |
| --- | --- |
| `node tools/test-combat-modules.mjs` | 5/5 imports passed |
| `node tools/test-combat-opponents.mjs` | 8/8 three-opponent cases passed |
| `node tools/test-combat-field-shields.mjs` | Physical contact, independent shields, legacy traffic parity, four-car visual binding and retirement passed |
| `node tools/test-combat-projectile-order.mjs` | The first swept bolt contact wins, independent of opponent list order |
| `node tools/test-combat.mjs` | 66 legacy combat checks passed |
| CPU combat and pickups, bomb momentum, road pickups, weapon upgrades | Passed |
| `node tools/test-audio.mjs` | 459 checks passed, including combat hit-position context |
| `node tools/test-replays.mjs` | 162 pinned one-opponent fingerprints unchanged |
| `node tools/test-opponents.mjs` | 213 checks passed; scripted three-opponent races reach ranked results across all 16 courses |
| `node tools/run-tests.mjs --tier lane --changed --jobs 8` | 107 suites passed, 0 failed, 0 not run in 550.49 s |
| `node tools/combat-balance.mjs --check` | Passed: Easy 80%, Medium 60%, Hard 40% win rates; crossbow aim 50% |
| `npm run build` | Passed; 178 modules transformed. Existing large-chunk advisory remains. |
| `node tools/browser-harness.mjs smoke` | High and Performance menu/race passed; four screenshots, zero warnings or errors; private port 32853 |
| `node tools/browser-harness.mjs scenario opponents` | Four models, rank 04/04, map announces three opponents; zero warnings or errors; private port 14692 |
| `node tools/browser-harness.mjs scenario combat-field` | CPU 3 spent an earned star charge and has a visible shield; player crossbow damaged CPU 2 and counted one hit; rank 04/04; zero warnings or errors; private port 24200 |
| `git diff --check` | Passed |

The first lane pass found that an existing socket fixture omitted
`state.opponents[]`. The scene now falls back to `state.rival` for that fixture;
its 845 socket checks and the final lane gate pass. No test assertion or
fingerprint was changed.

The focused combat screenshot is
`.qa-dist/browser-output/combat-field-2026-09-23T19-59-43-884Z/three-opponent-combat.png`.
The report alongside it records memory-only saves and no browser issues. The
browser scene captures the exchange and the live rank; the separate scripted
`test-opponents.mjs` proves completed, ranked races. The High/Performance smoke
report is `.qa-dist/browser-output/smoke-2026-09-23T20-00-14-185Z/report.json`.
The live checkout, its saves and port 5174 were untouched. The full tier and
exact integration merge gate remain for the integrator after merge.

## Boundary

The original one-rival shield scalar also protects traffic during bomb and
physical contact. This is a legacy quirk, but the refactor preserves it for
one-opponent replay parity. With multiple opponents, traffic has no borrowed
shield. A separate behavior-fix card can remove the quirk deliberately. The
normal menu still starts a one-opponent race. No player save format or
existing combat balance value changed.
