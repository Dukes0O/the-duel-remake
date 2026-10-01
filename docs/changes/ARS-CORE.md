# ARS-CORE — tests-first freeze, 30 September 2026

Source RED commit: 9ef873123e78b6ed4fcd866d6355da2185c8522a. Director claim is on that integration commit.
Only the two new suites and this note are owned here. No production source,
existing test, assertion, fingerprint, asset or save was edited.

## Settled rules and routine API contracts

Read SPEC section 0 first, AGENTS, the current ARS-CORE card and ARSENAL
sections 2–4. Game numbers come from that settled design. These public APIs
are routine implementation choices for independent source modules:

- hazards.js: addHazard(duel, spec), hazardsFor(duel), stepHazards(duel, dt),
  clearHazards(duel). A spec uses world x/z, kind, circle radius or strip
  length/width/heading, actual owner actor, lifetime, ownerGraceSec and
  onTouch(actor). Returned hazards expose age and opacity for presentation.
- car-effects.js: setCarEffect(car, kind, {duration, ...data}),
  carEffect(car, kind) returns state with remainingSec or null,
  stepCarEffects(car, dt), clearCarEffects(car). Reading consumers use the
  function; they never reach into a private field.
- oil.js: deployOil(duel, owner), shouldUseOil(duel, owner),
  oilThreat(duel, car, difficulty) returns a visible hazard or null.
- smoke.js: deploySmoke(duel, owner), shouldUseSmoke(duel, owner).
- targeting.js: targetFor(duel, attacker), the exact named design contract.
  Its undecided range context for decoys is not assigned a universal value.
- Deploy/slip events name settled cues in event.arsenalCue. This is a
  private WIP event interface; the protected audio consumer is not owned.

Independent CORE tests cover 24 bounded circle/strip hazards, actual native
car body edges, each body once per hazard, separate hazards, exit/re-entry,
owner grace without consuming entitlement, lifetimes, explicit cleanup,
all six timed effects and refresh without stacking. Oil tests cover rear
4 m placement, radius 3.5 m, lifetime 6 s, final-second fade, 1 s grace,
0.7 s slick at grip .35, 2.2 rad/s kick away, .85 speed, no armor damage,
shield/steering counters, nitro cancellation, 30 m rear-enemy use and
60 m Medium/Hard perception versus Easy. Smoke covers rear 4 m, radius 6 m,
5 s lifetime and exactly 30% speed drift for only its first second,
through/inside/around geometry and native recent-hit use within 5 s/50 m.
Seeded fixed steps compare the same core result at 30, 60 and 144 FPS.

## Deferred hooks and remaining whole-card acceptance

All existing source hooks remain requests, not granted. INTEGRATION cases
are separate from CORE cases. They contain real scheduled/direct CPU shot
controls, player straight-fire control, actual fired player/CPU bolt and
RPG guidance, real 48-step F exit and acquired 0.8 s RPG lock, native oil/
smoke CPU use, native recharge, disabled driving, lifecycle cleanup and
dev/discovery gates. Native clear-line CPU/RPG positive controls succeed
before their missing shared module assertion. Smoke bypass assertions must
remain RED after modules alone exist if a consumer is still unwired.
The discovery view also requires a Director request for wasteland-access.js,
which is not in the present hook request list.

Save API contracts are proposed for later granted weapon-upgrades hooks:
offeredArsenalWeapons(profile, {arsenalEnabled, implemented}),
purchaseArsenalWeapon(profile, id, {wastelandEnabled, arsenalEnabled}),
rewardArsenalWeapon(profile, id, {warlordId}), and
cpuArsenalLoadout(rank, difficulty, {implemented, rng}). CPU selection takes
src/rng.js seeded generator, never Math.random. Existing upgrade/equip/
loadout APIs may accept the same arsenal option. Tests use actual rank
calculation, pure profile transactions and memory-only registry storage.
They cover rank2/rank6 offers, 400 scrap, rejection guards, free early
reward, 150/300/600 upgrades, four unique slots, per-named-player purchase/
upgrade/equip/reward isolation, legacy starter levels, unknown/future earned
ids/levels/fields and opaque future schemas. The reward fixture uses the
existing version1 career.warlords.dustmonger.defeated receipt shape,
consistent with current Sal entitlement reading. It never invents a receipt
field or grants a reward from a warlord name alone. Actual Dustmonger
settlement-to-reward wiring still waits its built fight/receipt path.

The Director sent two design questions to Claude: decoy range context for
each aimed/homing/lock consumer, and which oil/smoke dimension receives the
authored 15% upgrade. Three explicit TODO cases record actual decoy CPU
launch/range and homing/lock bypass tests, plus the new-weapon upgrade
dimension. No guessed 180 m default or radius/lifetime bonus is tested.
Native proactive CPU steering around oil, rendered hazards/counters in
High/Performance, sound-bank/audio wiring and listening, and the thirty-
race balance report with real weapon-use counts remain whole-card gates.
No unwired module is a finished feature and no browser/audio/balance,
lane/build or integration merge clearance is claimed.

## RED commands and failure messages

Command: node --test --test-reporter=tap tools/test-arsenal-core.mjs tools/test-arsenal-save.mjs

Result: 64 tests, 3 pass, 58 fail, zero skips, 3 TODO. Core suite reaches
54 checks; save suite reaches 49. The three passing controls are fresh/
malformed no-unearned grants, legacy starter migration, and future-schema
opaque/refused-write protection. Existing-source save failures also expose
normalization/upgrade erasure of earned/future weapon fields, not only
missing APIs. Each first actual failure message follows:

| Test | Actual RED message |
| --- | --- |
| CORE: circle uses real car body overlap once per hazard | CORE: hazards.addHazard must exist |
| CORE: strip uses real car body overlap once per hazard | CORE: hazards.addHazard must exist |
| CORE: a circle beyond the actual body edge does not touch the car | CORE: hazards.addHazard must exist |
| CORE: owner grace preserves a later first eligible contact | CORE: hazards.addHazard must exist |
| CORE: hazards stay at most 24, expire and clear without touching race data | CORE: hazards.hazardsFor must exist |
| CORE: timed slick effect is independently readable and expires | CORE: car-effects.setCarEffect must exist |
| CORE: timed grip effect is independently readable and expires | CORE: car-effects.setCarEffect must exist |
| CORE: timed tether effect is independently readable and expires | CORE: car-effects.setCarEffect must exist |
| CORE: timed disabled effect is independently readable and expires | CORE: car-effects.setCarEffect must exist |
| CORE: timed burning effect is independently readable and expires | CORE: car-effects.setCarEffect must exist |
| CORE: timed nitro effect is independently readable and expires | CORE: car-effects.setCarEffect must exist |
| CORE: clearing one car effect never changes a different actual car | CORE: car-effects.setCarEffect must exist |
| CORE: oil deploys four metres rearward with its exact radius and lifetime | CORE: oil.deployOil must exist |
| CORE: actual oil body contact slips, kicks away, slows once and never damages armor | CORE: oil.deployOil must exist |
| CORE: oil steering/shield counter false | CORE: oil.deployOil must exist |
| CORE: oil steering/shield counter true | CORE: oil.deployOil must exist |
| CORE: oil contact ends active nitro early | CORE: car-effects.setCarEffect must exist |
| CORE: oil deploy eligibility follows an actual enemy within 30 m behind in lane | CORE: oil.shouldUseOil must exist |
| CORE: smoke deploys four metres behind, drifts for one second and then stays | CORE: smoke.deploySmoke must exist |
| CORE: targetFor smoke geometry at between actual car poses | CORE: targeting.targetFor must exist |
| CORE: targetFor smoke geometry at attacker actual car poses | CORE: targeting.targetFor must exist |
| CORE: targetFor smoke geometry at target actual car poses | CORE: targeting.targetFor must exist |
| CORE: targetFor smoke geometry at around actual car poses | CORE: targeting.targetFor must exist |
| CORE: hazard/effect results repeat at 30 presentation FPS | CORE: hazards.stepHazards must exist |
| CORE: hazard/effect results repeat at 60 presentation FPS | CORE: hazards.stepHazards must exist |
| CORE: hazard/effect results repeat at 144 presentation FPS | CORE: hazards.stepHazards must exist |
| INTEGRATION: arsenal is a production dev switch and discovery gates it | INTEGRATION: arsenal must start in dev |
| INTEGRATION: a real scheduled CPU shot cannot bypass smoke | CORE: hazards.addHazard must exist |
| INTEGRATION: direct native CPU launch cannot bypass smoke while player straight fire remains legal | CORE: hazards.addHazard must exist |
| INTEGRATION: an actual fired crossbow stops homing while smoke interrupts its line | CORE: hazards.addHazard must exist |
| INTEGRATION: real fighter RPG lock breaks and fired RPG guidance stops in smoke | CORE: hazards.addHazard must exist |
| INTEGRATION: stage end and a new stage remove hazards and timed effects | CORE: hazards.addHazard must exist |
| INTEGRATION: native oil/smoke recharge and disabled weapon counter are enforced | INTEGRATION: native car weapon path launches implemented oil |
| CORE: smoke CPU eligibility requires an actual hit within five seconds and enemy within fifty behind | CORE: smoke.shouldUseSmoke must exist |
| CORE: Medium and Hard perceive visible oil within sixty metres; Easy does not | CORE: hazards.addHazard must exist |
| INTEGRATION: native CPU weapon scheduler really deploys equipped oil | INTEGRATION: a real CPU with oil equipped must use it at the settled rear-enemy trigger |
| INTEGRATION: a native CPU bolt cannot home through smoke | CORE: hazards.addHazard must exist |
| INTEGRATION: native fired RPG homing independently cannot bypass smoke | CORE: hazards.addHazard must exist |
| CORE: one hazard separately affects each actual body exactly once | CORE: hazards.addHazard must exist |
| INTEGRATION: native CPU scheduler really deploys smoke after a recent native hit | INTEGRATION: native CPU with smoke equipped uses it after the settled real-hit trigger |
| INTEGRATION: native driving reads disabled effect without taking away ordinary driving | CORE: car-effects.setCarEffect must exist |
| INTEGRATION: native new weapons remain unavailable before discovery or with arsenal off | INTEGRATION: discovered enabled native weapon is the positive gate control |
| SAVE: earned and future weapon ids, levels and nested fields survive normalization | SAVE: earned oil cannot be dropped during normalization |
| SAVE: a purchased oil weapon costs exactly 400 scrap, retains credits and is idempotent | DEFERRED SAVE HOOK: weapon-upgrades.purchaseArsenalWeapon must exist |
| SAVE: arsenal purchase rejects the rank guard | DEFERRED SAVE HOOK: weapon-upgrades.purchaseArsenalWeapon must exist |
| SAVE: arsenal purchase rejects the switch guard | DEFERRED SAVE HOOK: weapon-upgrades.purchaseArsenalWeapon must exist |
| SAVE: arsenal purchase rejects the discovery guard | DEFERRED SAVE HOOK: weapon-upgrades.purchaseArsenalWeapon must exist |
| SAVE: arsenal purchase rejects the balance guard | DEFERRED SAVE HOOK: weapon-upgrades.purchaseArsenalWeapon must exist |
| SAVE: arsenal purchase rejects the unimplemented guard | DEFERRED SAVE HOOK: weapon-upgrades.purchaseArsenalWeapon must exist |
| SAVE: arsenal purchase rejects the future guard | DEFERRED SAVE HOOK: weapon-upgrades.purchaseArsenalWeapon must exist |
| SAVE: offered arsenal honors oil rank2, smoke rank6, implementation and discovery | DEFERRED SAVE HOOK: weapon-upgrades.offeredArsenalWeapons must exist |
| SAVE: earned Dustmonger entitlement unlocks smoke free below rank6 without enabling purchases | DEFERRED SAVE HOOK: weapon-upgrades.rewardArsenalWeapon must exist |
| SAVE: new owned weapons use all three existing scrap upgrade prices and stop at level3 | SAVE: earned implemented oil can use the existing upgrade transaction |
| SAVE: an owned implemented oil equips into four unique slots while a locked weapon cannot | SAVE: implemented earned oil becomes available |
| SAVE: starter purchase/equip changes preserve unknown earned ids and fields | SAVE: starter upgrade cannot erase a future earned weapon |
| SAVE: named player purchase, upgrade and equip survive actual registry roundtrip in memory | DEFERRED SAVE HOOK: weapon-upgrades.purchaseArsenalWeapon must exist |
| SAVE: CPU four-slot loadout uses seeded selection and only eligible implemented weapons | DEFERRED SAVE HOOK: weapon-upgrades.cpuArsenalLoadout must exist |
| SAVE: free warlord reward stays with its named player through registry reload | DEFERRED SAVE HOOK: weapon-upgrades.rewardArsenalWeapon must exist |

No existing assertions were changed. Read existing weapon-upgrades,
car-loadout and Wasteland-profile suites; their starter/locked/future-
schema controls do not contradict the new earned-id preservation rules.
Existing pins remain byte-identical and were not regenerated:

| Replay pin | SHA-256 |
| --- | --- |
| tools/replays/expected-fingerprints.json | b55182cbc6d6121a205fa24ba9049aeefabd7943a6e12ebba5a7f868c068c77a |
| tools/replays/combat-fingerprints.json | 85d9457ccd27534cfd7134547690b0ea5ad430fd9f374a63a1015c0b4b781536 |

A new pinned arsenal replay under tools/replays needs a later ownership
grant; this freeze owns only three named files. Core FPS equality is not
claimed as a substitute for that retained fingerprint. No old replay
suite or heavy gate was run in this tests-first step.

## Removed

Nothing removed. This adds tests and a recipe/verdict note only. No stub,
placeholder runtime module, dependency, audio resource, catalog, source
asset, world signature, real save, live checkout, Preview or port was used.
