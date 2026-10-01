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


## Independent module implementation — 30 September 2026

Started from clean tests-first freeze 8437d2c84bbc59acb783274b0013af302bf8534a.
This step owns only the five new src/arsenal modules and this section. No
existing production hook, assertion, replay pin, launcher or asset was edited.
The modules implement settled level-zero behavior; this is not whole-card
completion or merge clearance.

Hazards use the native point and vehicle shell dimensions, including heading
error and slip angle. Circle contacts use the closest point on the oriented
car rectangle; strips use the four separating axes of the two real rectangles.
A bounded list keeps at most 24 hazards, and a private WeakSet gives each
actual body one contact per hazard. Owner grace skips contact without spending
that entitlement. The native player, opponents, live traffic and pursuit cars
are considered in stable order, with native out-of-play protection respected.
Age, expiry, optional final fade and first-second drift advance only when the
simulation calls stepHazards. Reads and cleanup do not change race data.

Car effects use an independent per-car map with the six authored kinds.
Refreshing replaces duration and data instead of stacking. Duration zero
removes only the named effect; oil uses that to end nitro. Hazard lists and
effect maps are held in WeakMaps until lifecycle consumers are granted, so
importing these modules alone adds no fields to old race snapshots.

Oil implements the settled rear placement, six-second lifetime, final-second
fade, one-second owner grace, slick time/grip, away-from-centre yaw kick,
one-time speed loss and shield counter. Its rear-enemy decision uses native
teams, real distance and the sum of the two actual car half-widths for the
course-lateral lane overlap; no new arbitrary lane width is introduced.
Medium/Hard perception returns the nearest visible oil in the forward half
plane within 60 m; Easy returns none. Smoke implements placement, lifetime
and exact integration of its 30%-speed drift over only the first second.
Events name weapon.oil.deploy, weapon.oil.slip and weapon.smoke.deploy in
arsenalCue; sound consumers remain unwired.

targetFor retains native arena brain choices and the existing ordinary
player/CPU selection. A segment-circle test rejects a target when a live
smoke cloud crosses the line or contains either endpoint. It applies no
guessed decoy range or upgrade bonus. shouldUseSmoke reads actual arena
lastHitAt/lastHitBy recorded by native armor hits and checks the settled
5 s/50 m rear-enemy condition. Ordinary Wasteland currently has no per-car
recent-hit timestamp; its recording hook still needs a Director grant.

Commands and results on this source:

- node --test --test-reporter=tap --test-name-pattern='^CORE:' tools/test-arsenal-core.mjs:
  29/29 pass, 283 checks, zero failures/skips/TODO. The earlier missing-module
  RED is now GREEN for all independent CORE cases, with assertions unchanged.
- node --test --test-reporter=tap tools/test-arsenal-core.mjs tools/test-arsenal-save.mjs:
  64 tests, 32 pass, 29 fail, 3 design TODO, zero skips. Core reaches 317
  checks and save reaches 49. All 13 INTEGRATION cases remain RED at their
  real native bypass, lifecycle, launch, driving or gate assertions; all 16
  deferred save cases remain RED. Three existing save protection controls pass.
- node --test --test-reporter=tap tools/test-combat-projectiles.mjs tools/test-combat-projectile-order.mjs
  tools/test-combat-armor.mjs tools/test-combat-field-shields.mjs tools/test-crossbow-aim.mjs
  tools/test-enemy-aim.mjs tools/test-arena-event.mjs: 70/70 pass. Enemy aim
  retains 23/23 checks. Crossbow aim retains 792 shots, 420 hits (0.53).
- node tools/test-replays.mjs: all 162 unchanged recorded checks pass across
  18 cases, 16 events, eight categories, three FPS values and three runs.
- git diff --check: pass. New source uses LF and contains no Math.random,
  network or browser-storage calls.

| New source | SHA-256 |
| --- | --- |
| src/arsenal/hazards.js | 6fa20386836e17b21ba3d274f93d506e122da806732fe7956f17d4ce7b9f5ed7 |
| src/arsenal/car-effects.js | 39983d5ad6874d9b1768c5716a2070cd510e480b8d4d2a36e8b9df079e5038e8 |
| src/arsenal/targeting.js | ac7c65200d668989db27449f04de35ec6f501440b3554aae554e62812e492bbd |
| src/arsenal/oil.js | e507dfe8fcb88a94d0518df66b43120acc6b0b97c1881fc85e754f5f56a066c0 |
| src/arsenal/smoke.js | 1d508b03d925351eacbb2794af043398025aad482672e74a898ad33e32bd1c95 |

Frozen core suite SHA-256 remains
55c66d0586b1d0af6826491a8dba7b0c09e715d7995a21a3aef97ccabd9eb3a6;
frozen save suite remains
96d68ab206d655400c628b78133813f1aa9c62dbbee8ea4cb94f78988dcf9b66.
The two existing replay-pin hashes recorded above remain byte-identical.

Native scheduled/direct aimed fire, all guidance and RPG lock routing,
recharge/disable enforcement, effect driving, proactive oil steering,
lifecycle cleanup, discovery/dev gates and save/loadout/reward transactions
remain ungranted integration work. Decoy context and the oil/smoke upgrade
dimension still await Claude's written decisions. High/Performance rendering,
listening, actual weapon-use balance counts, retained arsenal replay, Guardian,
Claude, lane tier and build remain whole-card gates with the Director.
No browser, audio, heavy lane/full gate or build was run in this module step.

### Removed — independent module step

Nothing replaced or removed. These are new source modules. No stub or native
consumer bypass is accepted as completion. No real saves, live checkout,
Preview output, runtime dependency, protected audio/catalog or port was used.

## Independent module review regressions — 30 September 2026

RED source: clean 2ffecc718150c2b9621dea47956376aa628fd79c. This slice appends
only tests in tools/test-arsenal-core.mjs and this note. It changes no module,
production hook, original assertion, helper, fixture or replay pin.

The independent review found three failures in the settled body-contact,
away-from-pool kick and smoke targeting rules. New cases use actual Duel
cars and the native F exit and fighter movement. They introduce no decoy
range, upgrade choice or projectile-origin design.

- Rotated contact: a native Falcone at s=500/lateral=0 has half-width 1.02 m
  and half-length 2.35 m. At crashSpin=PI/2, both a radius-0.05 circle and a
  0.1-by-0.1 strip 1.685 m course-right touch its long body; the same
  course-forward placement misses its narrow body. Each real body gets
  at most one contact over three hazard steps. Nonspinning player/CPU
  and headingError=PI/2 CPU hit/miss controls pass.
- Oil direction: the actual player at s=500/lateral=0/slipAngle=0.4 touches
  oil deployed by the actual CPU at s=503/lateral=-0.1. The kick is +2.2
  rad/s when the body-relative away direction requires -2.2. The mirrored
  slip=-0.4/owner lateral=0.1 case fails in the opposite direction.
  Opposite-side and zero-slip controls pass. Before judging the sign,
  every case verifies grip 0.35 for 0.7 s, speed 60 to 51 once, unchanged
  armor, no repeated kick and exactly one native player slip cue.
- Fighter sightline: the native 48-tick F hold creates the actual RPG
  fighter. Native left+sprint input for 360 ticks moves it more than 20 m
  toward camera left and more than 24 m from its parked car. The actual
  first-person camera follows its x/z; parked car course coordinates stay
  fixed. A radius-6 cloud around that fighter leaves targetFor incorrectly
  returning its real rival. A cloud around only the parked car incorrectly
  returns null although the actual fighter line is clear. Independently
  checked segment-circle geometry separates those two lines. Unobscured
  car/fighter targets and smoke away from both points pass.

Commands and measured results:

- node --test --test-reporter=tap --test-name-pattern='^CORE: regression' tools/test-arsenal-core.mjs:
  19 selected cases, 11 pass, 8 fail, zero skips/TODO; the existing summary
  prints 166 acceptance checks reached.
- node --test --test-reporter=tap --test-name-pattern='^CORE:(?! regression)' tools/test-arsenal-core.mjs:
  all 29 protected original CORE cases pass, 283 checks, zero skips/TODO.
- Raw-byte comparison against the RED source: all 27,708 original core-suite
  bytes remain the exact prefix of the appended suite. Their SHA-256 stays
  55c66d0586b1d0af6826491a8dba7b0c09e715d7995a21a3aef97ccabd9eb3a6.
- Frozen save suite and both replay-pin SHA-256 values remain identical to
  the values recorded above. No pins were regenerated. git diff --check passes.

Exact new RED messages:

| New case | Failure message and actual result |
| --- | --- |
| Spinning player circle, course-right | spinning player actual long body touches course-right hazard once: 0 !== 1 |
| Spinning player circle, course-forward | spinning player actual narrow body misses course-forward hazard: 1 !== 0 |
| Spinning player strip, course-right | spinning player actual long body touches course-right hazard once: 0 !== 1 |
| Spinning player strip, course-forward | spinning player actual narrow body misses course-forward hazard: 1 !== 0 |
| Oil slip 0.4, owner lateral -0.1 | oil kick turns away from centre using actual player slip angle: 2.2 versus -2.2 |
| Oil slip -0.4, owner lateral 0.1 | oil kick turns away from centre using actual player slip angle: -2.2 versus 2.2 |
| Moved RPG fighter, cloud at fighter | moved actual RPG fighter inside smoke has no target: actual real rival, expected null |
| Moved RPG fighter, cloud at parked car | parked-car-only smoke does not block the moved actual RPG fighter clear line: actual null, expected real rival |

No heavy lane/full gate, build, browser or audio run was made for this RED
freeze. The already-deferred integration and save tests remain unchanged;
this slice does not grant hook ownership, whole-card completion or merge
clearance. A new retained arsenal replay still needs the later ownership
grant recorded above; this test-only slice preserves the existing pins.

### Removed — independent regression step

Nothing replaced or removed. Only new acceptance cases and their verdict
were appended. No source, dependency, asset, protected audio file, live
checkout, Preview output, port or real save was touched.


## Reviewed module fixes — 30 September 2026

Started from clean independent RED freeze
9d2d72bd7d3655e16da4358cffdbbdc9a957411c. Only hazards.js, oil.js,
targeting.js and this implementation section change. Both frozen suites,
all original/appended assertions and helpers, both replay pins, car-effects.js,
smoke.js and every existing production hook remain byte-identical.

A single carBodyPoint helper now supplies the physical orientation to hazard
body bounds and oil's away-from-centre calculation. It reuses the native car
point and matches render3d/combat-projectiles: course heading plus headingError,
then the actual player's slipAngle/crashSpin; native reverse-facing traffic
uses its existing turn. Circle/strip contact therefore follows the spinning
player's real long/narrow body. Oil now turns away in both reviewed sliding
directions. Effect strength, duration, speed loss, armor, shield/grace and
once-per-body/cue rules stay intact. The existing vehicle-knock.bodyHeading
helper omits the player's slip/crash spin, so it cannot supply this pose.

Smoke sightline endpoints use the current native fighter x/z when the actual
player actor is on foot and has a fighter. This applies whether that actor is
the attacker or target. Physical hazard bounds still use the parked car's
point. This creates no future CPU onFoot state. Native consumer projectile
origin, range and already-locked-target context still require the later hook
contract; decoy context and the oil/smoke upgrade dimension remain undecided.

Validation:

- node --test --test-reporter=tap --test-name-pattern='^CORE:' tools/test-arsenal-core.mjs:
  all 48 cases pass, 449 checks, no failures/skips/TODO. The 19 independently
  appended cases now pass (previously 11 pass/8 RED), while all 29 original
  CORE cases keep their 283 checks.
- node --test --test-reporter=tap tools/test-combat-projectiles.mjs tools/test-combat-projectile-order.mjs
  tools/test-combat-armor.mjs tools/test-combat-field-shields.mjs tools/test-crossbow-aim.mjs
  tools/test-enemy-aim.mjs tools/test-arena-event.mjs: 70/70 pass. Enemy aim
  is 23/23; crossbow aim stays 792 shots/420 hits (0.53).
- node tools/test-replays.mjs: all 162 unchanged retained checks pass across
  18 cases, 16 events, eight categories, three FPS values and three runs.
- node --test --test-reporter=tap tools/test-arsenal-core.mjs tools/test-arsenal-save.mjs:
  83 tests, 51 pass, 29 fail, 3 design TODO, zero skips. Core reaches 483
  checks; save reaches 49. Exactly the same 13 native integration failures
  and 16 save-hook failures remain; none is treated as completion.
- Raw-byte comparison against the independent RED commit confirms both
  test suites, both replay pins and the two unowned modules are exact.
  Frozen appended core suite SHA-256 is
  fcbf6e253bad37c5aacbd5c688304c222be5ffeca36bc673e468fc4ce571c210.
  Other protected hashes remain as recorded above. git diff --check passes;
  changed source uses LF.

| Fixed source | SHA-256 |
| --- | --- |
| src/arsenal/hazards.js | 128608a78c79fc896a51f1b11c83df6ba18f1a276dc965b621dbd1c087e9fa79 |
| src/arsenal/oil.js | 6bb341fd71cca0543ff9e91b5f841368f27971b5e4fbb35e445f0bdb9786d69d |
| src/arsenal/targeting.js | e1da18e9409a990440a4309101efe99dd494a6c9f379c1cbdc23d52845df8113 |

All previously named integration, save, retained arsenal-replay, visual,
audio, balance, Guardian/Claude, lane/build and full-tier obligations remain
with the Director. No heavy gate, build, browser, audio or merge clearance
is claimed by this narrow source fix.

### Removed — reviewed module fixes

Removed the two inconsistent module-local heading calculations and the
car-only smoke endpoint calculation, replacing them with the shared physical
pose and current native fighter endpoint read. No test, helper, assertion,
pin, asset, protected sound/catalog, dependency, real save, live checkout,
Preview output or port was changed.
