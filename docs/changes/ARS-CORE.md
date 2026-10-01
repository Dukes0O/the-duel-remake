# ARS-CORE — partial implementation, 30 September 2026

Latest bounded step: earned-ID preservation fix after clean independent RED
`8f34e1835f14600f530643ea4bf01b681323adee`. This step owns only
`src/weapon-upgrades.js` and this note. All 68 SAVE and 48 CORE tests pass;
13 native integration failures and three design TODOs remain. No whole-card,
lane/full-tier or merge pass is claimed. Independent Guardian and reviewer
review are required before further integration work.

Original tests-first baseline: 9ef873123e78b6ed4fcd866d6355da2185c8522a.
The Director claimed the card on that integration commit. That initial step
owned only two new suites and this note; production work followed under the
explicit grants recorded below.

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


## Granted pure save hooks — 30 September 2026

Source baseline: clean 56047037e8612f103a182d668f9bb81213c9456b.
Director grant 943de32 permits only weapon-upgrades.js, car-loadout.js,
wasteland-progress.js and this section. This is partial API work, pending
independent fixture review, Save Guardian and actual consumer/UI wiring.
No test, helper, core module, feature flag, App, combat, driving, render,
audio, launcher or replay path was edited.

WEAPON_IDS remains the four starters. Normalization retains valid earned and
future ids, unknown weapon fields and unknown levels. Known weapon levels
keep the existing zero-to-three clamp; an already-earned implemented id with
an absent level starts at zero, without creating ownership. Legacy starter
levels still take the larger saved value. Wasteland normalization retains
four saved slot identities when owned, including unimplemented future ids.
Runtime availability filters those ids until implemented and admitted;
equipping a known slot preserves future identities in untouched saved slots.

The implemented catalog contains oil (rank 2/wave 1) and smoke (rank 6/wave 1)
only. An implemented option can narrow it but cannot admit an unknown id.
Purchase requires supported version 1, actual discovery, both caller switches,
XP-derived rank and 400 scrap. It preserves credits and is pure/idempotent.
Offers use the same discovery/dev/real-rank admission. Free rewards map only
the existing Dustmonger defeat entitlement to smoke, including the supported
legacy defeated-id list; a warlord name alone, wrong mapping or unearned
receipt is refused. Reward never changes rank, credits, scrap or win receipts.
Owned implemented arsenal upgrades cost 150/300/600 scrap and cap at level 3;
no stronger/faster gameplay dimension is guessed. Starter credit and scrap
pricing keeps its established behavior. Future Wasteland schemas refuse writes.

CPU four-slot selection uses src/rng Fisher-Yates over distinct starter and
rank-eligible implemented candidates, with the settled difficulty wave caps.
A supplied seeded generator reproduces selection; the pure API's default is
a deterministic src/rng seed 1989. Per-car seeding and actual scheduler use
remain later consumer work. No new weapon is granted by normalization.

Validation on this source:

- Frozen SAVE RED reproduced before edits: 19 tests, 3 pass/16 fail, 49 checks.
- node --test --test-reporter=tap tools/test-arsenal-save.mjs: 19 tests,
  17 pass/2 fail, 187 checks. All pure purchase/reward/upgrade/equip/CPU and
  ownership-preservation assertions pass. The two remaining named-player
  cases fail only at their untouched second-profile full-object comparison.
- node --test --test-reporter=tap --test-name-pattern='^CORE:' tools/test-arsenal-core.mjs:
  all 48 unchanged cases pass, 449 checks.
- node --test --test-reporter=tap tools/test-weapon-upgrades.mjs tools/test-car-loadout.mjs
  tools/test-progression.mjs tools/test-progression-integration.mjs tools/test-wasteland-profile.mjs
  tools/test-save-fixtures.mjs tools/test-profile-damaged-fields.mjs:
  99/99 pass. This includes 3654 damaged-field checks, 247 checks across
  seven historical save fixtures, 146 App progression assertions and 27
  progression/leaderboard checks, all using memory-only storage.
- Combined frozen core/save suites: 83 tests, 65 pass/15 fail/3 design TODO,
  zero skips; 483 core and 187 save checks. The 13 native integration
  failures remain plus the two registry fixture mismatches below.
- Inline pure boundaries pass for missing earned levels (actual false RED
  before the default fix, true GREEN after), future slot/level/field retention,
  no forged stored-rank grant, implementation and switch guards, legacy
  mapped entitlement, wrong mapping, and exact future-schema refusals.
- Raw-byte comparisons against the baseline confirm both frozen suites,
  all five core modules, progression.js and both replay pins are unchanged.
  Frozen suite/pin hashes remain as recorded above. Changed source uses LF;
  git diff --check passes. No heavy gate or build was run.

The two remaining SAVE cases are named-player purchase/upgrade/equip reload
and free-warlord-reward reload. Their second raw career starts with
upgrades:{} from createProfile. Native registry normalization adds the
Falcone and Stuttgart maps, each with seven zero upgrade values. That is
the only differing field; the entire second Wasteland career remains equal.
A no-arsenal control performs zero arsenal calls, saves/loads those same
raw rank-two profiles in memory, and reproduces exactly this upgrades-only
delta. progression.js is byte-identical to the source baseline, SHA-256
6360f5aa2b7d05c76ab0599f043551610785a52930df66b5704ed579983918e2.
Changing that existing normalization would need an ungranted hook; the
Director has retained both assertions for independent fixture review.

| Granted source | SHA-256 |
| --- | --- |
| src/weapon-upgrades.js | f1963f2256e315580514ef47f92db07bc09eff6479c4dd629cf37118fb002d5c |
| src/car-loadout.js | aff0f3e89befe947a7e83ff6bf15b690b712d73c613badfb279718b31e321a75 |
| src/wasteland-progress.js | 40e9934fbbc5bf19f1d00ce28692330653d3ceb13c1b67aa344987ec0c4eac6f |

Save Guardian and independent review are required before this slice proceeds.
All native routing, actual warlord-settlement reward invocation, UI/gate
wiring, gameplay upgrade dimension, rendering, audio, real weapon-use balance,
retained arsenal replay and lane/build/full gates remain pending with the
Director. This note grants no whole-card completion or merge clearance.

### Removed — granted save hook step

Removed starter-only weapon/level reconstruction and starter-only saved-slot
filtering that erased earned/future identities. Replaced the packed upgrade
module with readable LF source, preserving its established starter behavior.
No legacy credit/race rule, frozen assertion, fixture, core module, pin,
licensed asset, protected sound/catalog, dependency, real save, live checkout,
Preview output or port was changed.

## Independently approved named-player fixture correction

The two original whole-profile equality checks now pass without changing
their assertions. Both second-player fixtures are normalized before their
snapshots. The independent test author and Save Guardian each reproduced
the old raw fixture difference on actual 56047037 and dd8ca6c with no Arsenal
calls: upgrades:{} becomes the two free cars' seven all-zero upgrade fields;
no other field changes and raw inputs remain untouched. Guardian explicitly
approved only these two setup corrections before the Integrator applied them.

A separate no-Arsenal control covers rank2/2000 scrap and rank1/0 scrap. It
checks the exact established default maps, raw-input immutability, canonical
whole-profile roundtrip and normalization idempotence using memory storage.
The default save suite is now20/20 with211checks. Raw-byte restoration of
only the two setup expressions proves the entire old test prefix is exact.
Source, core suites and replay pins remain dd8ca6c bytes. This clears the
fixture mismatch, not Save Guardian's ongoing source review or whole-card
native wiring, gates, browser, balance, sound and Claude design obligations.

Guardian has separately proved that the new100-entry weapon-id cap can erase
an earned identity and its saved slot. That is a source finding requiring an
independent RED and fix; the fixture correction does not waive it.

### Removed — named-player fixture correction

Removed the two raw second-player fixture snapshots in favour of canonical
fixtures at the existing native registry boundary. Every original assertion
and all production behavior remain unchanged. No asset, old test, pin,
licensed source, real save or unmerged lane work was removed.


## Independent owned-identity preservation RED

Save Guardian's source finding is now reproduced by appended native tests.
Exact RED source is clean
`6d1fdd08fba606e2f36c7a7102a26c4550c03dd9` (production save hooks
`dd8ca6c`). No source fix or original assertion change was made.

Command:

`node tools/test-arsenal-save.mjs`

Exit 1: **68 tests, 44 pass, 24 fail, 427 acceptance checks**, 60.398 ms.
All 24 failures are loss of full earned ownership or its exact saved slot.

The original suite remains independently green:

`node --test --test-name-pattern '^SAVE(:| CONTROL:)' --test-reporter=tap tools/test-arsenal-save.mjs`

Exit 0: **20/20, 211 checks**, 97.071 ms. The complete original 16,922-byte
test prefix is byte-identical to the source freeze, SHA-256
`533053f59c67d0f7599d978a24d716a6b55aa6359c7fbdab94081b9556729216`.
Both original whole-profile second-player assertions, the independently
approved canonical-fixture correction and all no-Arsenal controls remain
unchanged. No existing replay fingerprint was regenerated.

### Independent cases and controls

The three boundary witnesses are supported version-one careers with actual
rank six, 4,000 scrap, four unique saved slots, earned levels and nested
unknown weapon/career fields:

| Case | Raw owned input | Lost earned identity |
| --- | --- | --- |
| duplicate-prefix | 100 duplicate ufo entries followed by earned oil | oil |
| 101-distinct | Four starters and 97 distinct future identities | future-owned-96 |
| 81-character | Four starters and one earned 81-character future identity | The long future identity |

These numbers reproduce the undocumented source bounds; they do not impose
a new accepted maximum count or identity length. Ownership expectations
deduplicate the source and retain every earned identity, with the existing
four starters. No invented cap or forged rank grants ownership.

For every case, separate checks run the actual paths:

- `normalizeProfile`.
- `createPlayerRegistry`, `savePlayers` and `loadPlayers` using a fresh
  disposable memory Map.
- An actual eligible `purchaseArsenalWeapon(..., 'smoke')`, then registry
  save/reload.
- An actual `equipCarWeapon(..., 1, 'ufo')` change to another known slot,
  then registry save/reload.

Each path independently checks the full owned list, exact levels, nested
unknown fields and all four exact unique saved slots. Input immutability
and successful native transactions/saves are checked in every witness.
These are real normalization and transaction functions, not fake profiles,
progression mocks, private helper mirrors or source-text assertions.

All 24 level/nested-field tests pass; all raw-input immutability and transaction
guards pass. The 24 ownership/slot tests fail for the actual loss. Normalization
and registry reload can shrink the loadout to three slots. Equip can fill four
slots while silently replacing the lost earned slot, so exact identity/order
equality is retained as well as the four-slot and uniqueness controls. A
successful smoke purchase can also disappear after reload when the count cap
is reached; full-list equality catches that same preservation defect.

The source's `validIds` rejects strings longer than 80 characters and truncates
the input to 100 entries before deduplication. `normalizeWasteland` then
filters saved slots against the truncated owned list. The source builder
must repair that preservation path and retain malformed-input, starter,
future-schema, pure-transaction and named-player guards. This RED note is not
source-complete or merge clearance. Independent Save Guardian review and the
card's remaining native integration/gates are still required.

Raw RED output stays ignored at
`.evidence/2026-09-30/ARS-CORE/owned-identity-red/red.txt`.
The final failure messages are listed below.

### Removed — owned-identity test freeze

Nothing replaced or removed. Only independent acceptance cases were appended
to the save suite and this note. Production, previous assertions, approved
fixture setups, core tests, replay pins, assets, licensed sources, protected
audio files, real saves, live/Preview and other lane work are untouched.
The merge janitor deletes raw evidence after its verdict is retained.

### Each independent RED failure

- SAVE PRESERVATION: duplicate-prefix/normalize retains every earned owned identity: duplicate-prefix/normalize: full earned ownership must survive without an arbitrary count or length cap
- SAVE PRESERVATION: duplicate-prefix/normalize retains FOUR unique saved slots: duplicate-prefix/normalize: losing an owned identity must never delete or replace its saved slot
- SAVE PRESERVATION: duplicate-prefix/registry retains every earned owned identity: duplicate-prefix/registry: full earned ownership must survive without an arbitrary count or length cap
- SAVE PRESERVATION: duplicate-prefix/registry retains FOUR unique saved slots: duplicate-prefix/registry: losing an owned identity must never delete or replace its saved slot
- SAVE PRESERVATION: duplicate-prefix/purchase retains every earned owned identity: duplicate-prefix/purchase: full earned ownership must survive without an arbitrary count or length cap
- SAVE PRESERVATION: duplicate-prefix/purchase retains FOUR unique saved slots: duplicate-prefix/purchase: losing an owned identity must never delete or replace its saved slot
- SAVE PRESERVATION: duplicate-prefix/equip retains every earned owned identity: duplicate-prefix/equip: full earned ownership must survive without an arbitrary count or length cap
- SAVE PRESERVATION: duplicate-prefix/equip retains FOUR unique saved slots: duplicate-prefix/equip: losing an owned identity must never delete or replace its saved slot
- SAVE PRESERVATION: 101-distinct/normalize retains every earned owned identity: 101-distinct/normalize: full earned ownership must survive without an arbitrary count or length cap
- SAVE PRESERVATION: 101-distinct/normalize retains FOUR unique saved slots: 101-distinct/normalize: losing an owned identity must never delete or replace its saved slot
- SAVE PRESERVATION: 101-distinct/registry retains every earned owned identity: 101-distinct/registry: full earned ownership must survive without an arbitrary count or length cap
- SAVE PRESERVATION: 101-distinct/registry retains FOUR unique saved slots: 101-distinct/registry: losing an owned identity must never delete or replace its saved slot
- SAVE PRESERVATION: 101-distinct/purchase retains every earned owned identity: 101-distinct/purchase: full earned ownership must survive without an arbitrary count or length cap
- SAVE PRESERVATION: 101-distinct/purchase retains FOUR unique saved slots: 101-distinct/purchase: losing an owned identity must never delete or replace its saved slot
- SAVE PRESERVATION: 101-distinct/equip retains every earned owned identity: 101-distinct/equip: full earned ownership must survive without an arbitrary count or length cap
- SAVE PRESERVATION: 101-distinct/equip retains FOUR unique saved slots: 101-distinct/equip: losing an owned identity must never delete or replace its saved slot
- SAVE PRESERVATION: 81-character/normalize retains every earned owned identity: 81-character/normalize: full earned ownership must survive without an arbitrary count or length cap
- SAVE PRESERVATION: 81-character/normalize retains FOUR unique saved slots: 81-character/normalize: losing an owned identity must never delete or replace its saved slot
- SAVE PRESERVATION: 81-character/registry retains every earned owned identity: 81-character/registry: full earned ownership must survive without an arbitrary count or length cap
- SAVE PRESERVATION: 81-character/registry retains FOUR unique saved slots: 81-character/registry: losing an owned identity must never delete or replace its saved slot
- SAVE PRESERVATION: 81-character/purchase retains every earned owned identity: 81-character/purchase: full earned ownership must survive without an arbitrary count or length cap
- SAVE PRESERVATION: 81-character/purchase retains FOUR unique saved slots: 81-character/purchase: losing an owned identity must never delete or replace its saved slot
- SAVE PRESERVATION: 81-character/equip retains every earned owned identity: 81-character/equip: full earned ownership must survive without an arbitrary count or length cap
- SAVE PRESERVATION: 81-character/equip retains FOUR unique saved slots: 81-character/equip: losing an owned identity must never delete or replace its saved slot

## Earned-ID preservation source fix — 30 September 2026

Built on clean independent RED `8f34e1835f14600f530643ea4bf01b681323adee`, production hooks `dd8ca6c7350f641e7fa8757c50bba76288027e9e` and independently approved fixture correction `6d1fdd08fba606e2f36c7a7102a26c4550c03dd9`. The Director granted only `src/weapon-upgrades.js` and this note for this fix. Other source hooks, both independent suites, core modules, replay pins and the Salt Flats lane remain untouched.

The actual `validIds` helper previously filtered out earned strings longer than 80 characters and took the first 100 entries before deduplication. That erased late earned oil, a 101st future identity and an 81-character future identity. The native Wasteland normalizer then dropped or replaced their four-slot saved identities. These were undocumented limits; settled ARSENAL save rules require preservation and impose neither limit.

The source fix removes only those count and length limits. It still accepts an array of nonempty string identities; existing ownership deduplication, four starters, level normalization and unknown-field preservation continue unchanged. It does not manufacture ownership from levels or catalog entries. Existing reward receipts, offer/dev/discovery guards, rank, XP, credits, scrap costs, upgrade caps and seeded CPU selection keep their current rules. The independent malformed, future-schema, named-player and transaction controls remain unchanged.

### Actual RED to GREEN

- Before the source edit, `node tools/test-arsenal-save.mjs` reproduced **68 tests, 44 pass, 24 fail, 427 acceptance checks** on the clean independent freeze. All 24 failures were the documented earned-identity or exact-slot loss.
- After the edit, the same unchanged default suite passes **68/68**, reaching **451 acceptance checks**. Normalize, memory registry save/reload, actual smoke purchase/reload and actual equip/reload retain every earned identity, level, unknown field and all four exact saved slot identities in all three independent witnesses. The original 20 tests and approved canonical fixtures remain included.
- `node --test --test-name-pattern '^CORE:' --test-reporter=tap tools/test-arsenal-core.mjs`: **48/48 pass**.
- The complete unchanged two-suite command reaches **132 tests: 116 pass, 13 fail, three TODO**. Those 13 are the existing ungranted native consumers, and the three TODOs remain the written design questions. This narrow save repair does not hide or resolve them.
- Existing relevant controls pass **108/108 TAP tests across 11 suites**: weapon upgrades, car loadout, Wasteland profile, career backup, progression, App progression integration, historical save fixtures, damaged profile fields, combat credit bonus, storage budget and career budget. These include **3,654 damaged-profile checks**, **seven historical fixtures/247 first-load and round-trip checks**, **146 App progression assertions** and **27 progression/leaderboard controls**. The storage model remains **3.48 MB / 4.00 MB**; maximum ghost journal is **2,500,604 / 4,000,000 bytes**. These controls use disposable memory storage only.
- `npm run build`: passes on this isolated lane; the existing large-chunk warning remains. No Preview/live build or port was used.

Private logs stay under ignored `.evidence/2026-09-30/ARS-CORE/owned-identity-fix/`. No test/assertion/fixture/pin changed. `node tools/test-replays.mjs` passes **162/162** checks across 18 cases, 16 events, eight categories, three frame rates and three runs. No replay pin was regenerated.

### Source and protected hashes

| File | SHA-256 |
| --- | --- |
| Fixed src/weapon-upgrades.js | 6b5f76ac6d537b9b80986cf11bbaea59142fc202cb4da8736707d999489a8cc8 |
| Unchanged src/car-loadout.js | aff0f3e89befe947a7e83ff6bf15b690b712d73c613badfb279718b31e321a75 |
| Unchanged src/wasteland-progress.js | 40e9934fbbc5bf19f1d00ce28692330653d3ceb13c1b67aa344987ec0c4eac6f |
| Unchanged src/progression.js | 6360f5aa2b7d05c76ab0599f043551610785a52930df66b5704ed579983918e2 |
| Frozen tools/test-arsenal-core.mjs | fcbf6e253bad37c5aacbd5c688304c222be5ffeca36bc673e468fc4ce571c210 |
| Frozen tools/test-arsenal-save.mjs | f1e9afafa39838f5fbd4f822ff021672f659940a33f5659aa262164616ee2427 |
| Existing ordinary replay pin | b55182cbc6d6121a205fa24ba9049aeefabd7943a6e12ebba5a7f868c068c77a |
| Existing combat replay pin | 85d9457ccd27534cfd7134547690b0ea5ad430fd9f374a63a1015c0b4b781536 |

### Remaining acceptance and Removed

Independent Save Guardian and source reviewer approval are still required. Existing native scheduled fire/homing/lock, effects/lifecycle, recharge, CPU use and discovery/dev consumer wiring remain ungranted, as do the later armory UI, rendering and protected audio hooks. The settled upgrade dimension and decoy contexts still need Claude's written answer. Actual game/browser, High/Performance rendering, listening, thirty-race balance with real use counts, retained Arsenal replay and mandatory lane/full gates remain outstanding. No finished-feature or merge claim follows from this repair.

Removed the arbitrary 100-entry and 80-character truncations from the ID normalizer. No earned data, old assertion, fixture, core module, replay fingerprint, runtime asset, licensed source, external audio, real save or other lane work was removed. The fix forwards through the independently reproduced loss rather than rewriting history.

## PROSPECTIVE Arsenal registry-wiring acceptance — 1 October 2026

RED consumer source: clean cd73eb1613eb841c0e600aa363371067d22953f2.
This tests-first slice owns only appended save-suite cases and this section.
It changes no production file, previous assertion, helper, fixture or replay pin.

The current production WEAPONS dictionary is frozen, is not extensible and
contains only four starters. Genuine temporary Oil/Smoke registration in
that object is impossible. No current gameplay leak is claimed. The Director
therefore explicitly approved an isolated in-memory native module-loader
fixture to test the impending registration obligation before runtime wiring.
Actual combat registry changes still wait for the Fuel merge and their hook
handoff; this fixture grants no runtime, flag, UI or audio ownership.

The fixture follows the existing data-URL import-routing pattern used by
polyline-terrain and scenery tests. It reads the genuine car-loadout module
and changes only its import routing. Its complete consumer body stays byte-
identical; availableCarWeapons, getCarLoadout and equipCarWeapon are neither
mocked nor reimplemented. The replacement dependency imports the real starter
dictionary and extends it in memory with only Oil Slick (10 s recharge) and
Smoke Screen (14 s recharge), as ARSENAL section 3 settles. All other imports
resolve to their actual production modules. The frozen production dictionary
is never mutated. No assertion requires registry mutability or permanent
registration; this is explicitly prospective acceptance.

Seven views exercise native availability and runtime slots separately:
default options, dev off, Wasteland off, undiscovered player, no implemented
Arsenal ids, Oil only and Smoke only. Each excluded weapon also gets its own
native equip rejection test. Actual canonical earned profiles hold all four
starters, owned Oil/Smoke and a future identity, with levels, nested receipts,
unknown profile/career fields and four exact saved identities. Read and equip
checks compare entire raw/canonical source profiles, not selected fields.
Filtering usable weapons must never erase the saved future ownership or slots.

Passing controls prove eligible owned registered weapons work, every starter
remains available, native equip swaps only the chosen slots while retaining
all four unique identities and the entire profile, registry entries alone
never grant ownership, and normalization stays idempotent. A real named-player
registry saves/reloads disposable memory storage: both complete profiles,
levels, nested fields, the future saved slot and stored raw bytes survive;
the second player receives no earned weapon. Production dictionary descriptors
stay unchanged throughout. These controls use native normalization, registry
and loadout functions with no browser or real saves.

### Measured RED and protected passing controls

- Before appending tests, node tools/test-arsenal-save.mjs passes all original
  68/68 cases, 451 checks, on the unchanged consumer.
- node --test --test-reporter=tap --test-name-pattern='^SAVE PROSPECTIVE:' tools/test-arsenal-save.mjs:
  30 selected cases, four pass, 26 fail, 139 reached checks, no skips/TODO.
- The full default save suite after append: 98 cases, 72 pass, 26 fail,
  590 reached checks, no skips/TODO. Every failure is a new prospective gate
  failure; all original 68 cases still pass.
- All 21,299 original save-suite bytes remain an exact prefix, SHA-256
  f1e9afafa39838f5fbd4f822ff021672f659940a33f5659aa262164616ee2427.
  Existing core suite and both replay pins remain byte-identical to the RED
  source and their recorded hashes. No replay pin was regenerated.
- Actual car-loadout source hash remains
  aff0f3e89befe947a7e83ff6bf15b690b712d73c613badfb279718b31e321a75;
  actual wasteland-tuning remains
  5dbbdd39dc4c20f6eb3c861e0c76ae58eea1b0e0183c838f32d25edd44c66022.
  git diff --check passes.

### Each prospective RED failure message

Availability always returns starters plus both Oil/Smoke; runtime slots
always retain both, although the relevant view excludes one or both.
Every excluded native equip incorrectly returns ok=true rather than false.
These are the exact messages from the native-consumer fixture:

- prospective default-view: registered-owned Oil/Smoke cannot bypass the Arsenal availability guards
- prospective default-view: actual runtime slots contain only admitted registered weapons
- prospective default-view: native equip must reject excluded registered oil
- prospective default-view: native equip must reject excluded registered smoke
- prospective dev-off: registered-owned Oil/Smoke cannot bypass the Arsenal availability guards
- prospective dev-off: actual runtime slots contain only admitted registered weapons
- prospective dev-off: native equip must reject excluded registered oil
- prospective dev-off: native equip must reject excluded registered smoke
- prospective wasteland-off: registered-owned Oil/Smoke cannot bypass the Arsenal availability guards
- prospective wasteland-off: actual runtime slots contain only admitted registered weapons
- prospective wasteland-off: native equip must reject excluded registered oil
- prospective wasteland-off: native equip must reject excluded registered smoke
- prospective undiscovered: registered-owned Oil/Smoke cannot bypass the Arsenal availability guards
- prospective undiscovered: actual runtime slots contain only admitted registered weapons
- prospective undiscovered: native equip must reject excluded registered oil
- prospective undiscovered: native equip must reject excluded registered smoke
- prospective unimplemented: registered-owned Oil/Smoke cannot bypass the Arsenal availability guards
- prospective unimplemented: actual runtime slots contain only admitted registered weapons
- prospective unimplemented: native equip must reject excluded registered oil
- prospective unimplemented: native equip must reject excluded registered smoke
- prospective oil-only: registered-owned Oil/Smoke cannot bypass the Arsenal availability guards
- prospective oil-only: actual runtime slots contain only admitted registered weapons
- prospective oil-only: native equip must reject excluded registered smoke
- prospective smoke-only: registered-owned Oil/Smoke cannot bypass the Arsenal availability guards
- prospective smoke-only: actual runtime slots contain only admitted registered weapons
- prospective smoke-only: native equip must reject excluded registered oil

No heavy lane/full tier, build, browser, audio or combat wiring was attempted
for this tests-first freeze. Guardian/reviewer approval and the remaining
whole-card consumer, save, presentation, balance, replay and merge gates stay
outstanding. A new retained Arsenal replay remains under the later ownership
grant; this slice owns no replay files and preserves their existing pins.

### Removed — prospective registry test freeze

Nothing replaced or removed. Tests and their verdict were appended only.
No production registry mutation, dependency, source, previous assertion,
asset, licensed file, protected audio, other lane, real save, live checkout,
Preview output or port was used or changed.

## Prospective registry gate source fix — 1 October 2026

Built after clean independent tests-first freeze `496d600ee1f00ba20046bd3d9aa86be274eee793`. The Director granted only the existing `src/car-loadout.js` hook and an append-only section of this note. Every previous note byte, assertion, test fixture and other source file is retained.

The legacy availability branch previously accepted every key from `WEAPONS`. That is safe with today's frozen four-starter production dictionary, but would let a genuinely registered owned Oil/Smoke bypass the caller's Arsenal gates after registry wiring. The source fix filters only that legacy branch to the four `WEAPON_IDS`. Every owned extra still goes through the existing `arsenalCareerAvailable` and `implementedArsenalWeapons` guards. Default options, dev off, Wasteland off, undiscovered player and an empty implementation list admit no extras; Oil-only and Smoke-only views admit only their corresponding earned implemented weapon.

This is **prospective genuine-consumer acceptance**, not a reproduced current-gameplay leak. The frozen test routes the actual native consumer's imports to an isolated extended registry; every consumer-body byte remains genuine, all other dependencies stay real and the current production dictionary remains frozen and unchanged. No Oil/Smoke registration, new registry API, flag, UI, event, driving, combat, audio or sound-bank consumer was installed here.

Saved earned and future IDs, levels, nested fields and exact slots remain intact. Runtime reads produce four unique usable choices without rewriting the profile. Eligible native equip swaps the requested saved slots while preserving future slots and the complete profile; excluded equip returns the unchanged input. Registry membership never creates ownership. The existing seeded CPU helper and its caller-supplied RNG contract are unchanged.

### Actual checks

- Before the source edit, `node tools/test-arsenal-save.mjs` reproduced **98 cases: 72 pass, 26 fail**, reaching **590 checks** on the clean independent freeze. All failures were the new prospective gates; the original 68 save cases stayed green.
- After the edit, that same unchanged default command passes **98/98**, reaching **602 acceptance checks**, without skips or TODOs.
- Independent original subset, `node --test --test-name-pattern '^(SAVE:|SAVE CONTROL:|SAVE PRESERVATION:)' --test-reporter=tap tools/test-arsenal-save.mjs`: **68/68, exactly 451 checks**. The earned-ID preservation fix, arbitrary-length/count witnesses and original named-player/future-schema controls remain unchanged.
- Independent prospective subset, `node --test --test-name-pattern '^SAVE PROSPECTIVE:' --test-reporter=tap tools/test-arsenal-save.mjs`: **30/30, 151 checks**. Native availability/runtime/equip gates, complete raw/canonical profile immutability, four-slot uniqueness, future saved identity and both complete named careers survive the real memory registry. Production registry descriptors remain unchanged.
- `node --test --test-name-pattern '^CORE:' --test-reporter=tap tools/test-arsenal-core.mjs`: **48/48 pass**.
- Complete unchanged core/save command: **162 cases, 146 pass, 13 native integration failures, three design TODOs**. The prospective fixture does not bypass or substitute for those unwired real-game consumers.
- Relevant existing controls: **108/108 TAP tests across 11 suites** pass (car loadout, weapon upgrades, Wasteland profile, backup, progression, App progression, historical fixtures, damaged profile, combat credits and both save budgets). They retain **3,654 damaged-profile checks**, **seven historical fixtures/247 first-load and round-trip checks**, the **3.48 MB / 4.00 MB** storage model and **2,500,604 / 4,000,000 byte** maximum ghost journal.
- `node tools/test-replays.mjs`: **162/162 pass** across 18 cases, 16 events, eight categories, three frame rates and three runs. Existing road fingerprints and pins are unchanged.
- `npm run build`: passes in the isolated lane's normal `dist`; the existing large-chunk warning remains. No Preview/live build, protected port, browser storage or real save was used.

Changed assertions/fixtures/pins: **none**. Private logs stay under ignored `.evidence/2026-10-01/ARS-CORE/registry-gate-fix/`. The source remains LF and staged diff is checked before the clean review freeze.

### Source and protected hashes

| File | SHA-256 |
| --- | --- |
| Fixed src/car-loadout.js | e20d84276b5d8c5e5e45629579a306db220354278eff16ea88fdf7c9600d918e |
| Unchanged earned-ID src/weapon-upgrades.js | 6b5f76ac6d537b9b80986cf11bbaea59142fc202cb4da8736707d999489a8cc8 |
| Unchanged src/wasteland-progress.js | 40e9934fbbc5bf19f1d00ce28692330653d3ceb13c1b67aa344987ec0c4eac6f |
| Unchanged production registry src/combat.js | 7b76be52faaa560aba8c7110129b8e5668e44c56b235da973ace2913706cc4c0 |
| Unchanged src/wasteland-tuning.js | 5dbbdd39dc4c20f6eb3c861e0c76ae58eea1b0e0183c838f32d25edd44c66022 |
| Frozen complete save suite | 54480590357b34f190dc2ce8f713ccb420ece5a959480ade437254ecb5f6b945 |
| Frozen core suite | fcbf6e253bad37c5aacbd5c688304c222be5ffeca36bc673e468fc4ce571c210 |
| Existing ordinary replay pin | b55182cbc6d6121a205fa24ba9049aeefabd7943a6e12ebba5a7f868c068c77a |
| Existing combat replay pin | 85d9457ccd27534cfd7134547690b0ea5ad430fd9f374a63a1015c0b4b781536 |

### Remaining acceptance and Removed

Independent Save Guardian and generic source reviewer approval remain required. The 13 actual native consumer failures, three written Claude design TODOs, real registry/flag/discovery/armory/event/driving/aim/homing/lock/render wiring, protected audio, listening, game/browser/balance, retained Arsenal replay and lane/full merge gates remain outstanding. No whole-card, lane/full-tier or merge pass is claimed by this narrow source continuation.

Removed the prospective registry-key bypass for nonstarter weapons from the legacy availability branch. The four starter rules and existing earned-extra gates remain. No saved identity, data, old consumer, fixture, assertion, replay pin, current registry, runtime asset, licensed source, protected audio, other lane work or real save was removed. All earlier note sections are retained verbatim.

## Independent Arsenal dev-flag boundary RED — 1 October 2026

The Arsenal switch must be a named development entry in the real catalog. Production defaults and URLs must leave it off; a private QA build may enable it only by explicit request. The current source has no Arsenal entry. These tests expose that missing entry without registering Oil/Smoke, changing any game rule or mocking a catalog.

First, the Director-authorized normal merge brought integration `e0b7fffe69b28f7a40a392d31290b86ef4008d77` into clean Arsenal `58116aec7e8eafd1308be8bc399b3c7a9624e269`. It completed without conflicts at `1cb461113ab8df05a0b77fe996c70cfa432b6bee`, retaining current Fuel and reviewed steering. No history was rewritten and no source was manually edited. This exact merged source is the RED baseline.

Before editing any existing expectation, independent reviewer `/root/audio_output_source_review` approved exactly two catalog-test updates. The Director confirmed that approval:

- The complete `FEATURE_STATES` dictionary assertion in `test-wasteland-beta.mjs` adds only `arsenal: 'dev'`. Every prior entry remains exact, including `fuel-run: 'dev'`; it remains a complete dictionary comparison.
- The complete state predicate in `test-feature-flags.mjs` adds `FEATURE_STATES.arsenal === 'dev'` and changes the exact key count from eight to nine. Every prior state, release/retirement predicate and assertion message remains unchanged. No partial dictionary or minimum-count substitute is used.

These are explicit reviewed assertion changes required by the card's settled `arsenal` dev switch. They do not relax a gameplay or release requirement. All other existing assertions remain byte-for-byte unchanged.

New controls call the actual imported `createFeatureFlags` with its default production catalog and `storage: null`: production default off, production `?flags=arsenal` off, explicit private QA `?flags=arsenal` on, unnamed QA off, and a QA request for Fuel Run leaving Arsenal off. The beta suite also proves that the requested Fuel dev entry stays available and that requesting Arsenal does not implicitly request Fuel. No catalog argument, test override, browser profile, real save or production fallback invents the missing entry.

### Actual baseline and RED commands

Before these edits on merged source 1cb4611:

- `node tools/test-feature-flags.mjs`: **27 checks passed**, exit 0.
- `node tools/test-wasteland-beta.mjs`: **4/4 tests passed**, exit 0.

After the tests-only edits against the same unchanged source:

- `node tools/test-feature-flags.mjs`: exit 1 at its first complete catalog predicate. `FEATURE_STATES.arsenal` is undefined and the actual count remains eight. Its retained assertion message begins `career backup and Fuel Run stay in QA`; actual is false, expected true. This sequential suite stops there, so it does not claim that its later checks ran. Once the source implements the missing entry, its five appended controls bring the summary to 32 checks.
- `node tools/test-wasteland-beta.mjs`: **8 tests, six passed, two failed**, no skips/TODOs, exit 1. The complete dictionary failure is `Expected values to be strictly deep-equal`, with missing expected `arsenal: 'dev'` and every eight prior entry matching. The independent actual QA failure is `actual registered Arsenal is available only when explicitly requested in QA`, `false !== true`. All production-off, production-URL-off and unnamed/other-request QA-off cases run and pass. Existing Fuel isolation and the beta journey evidence controls remain green.

Raw stdout/stderr are retained under `.evidence/2026-10-01/ARS-CORE/flag-tests-red/feature-flags.log` and `wasteland-beta.log`. These are genuine admission failures, not missing imports or test infrastructure. The existing core/native consumer suites, discovery controls, save assertions, road/combat pins and three design TODOs are untouched; their previously frozen incomplete integration verdict is not replaced by this narrow flag test result.

No source flag, launcher, registry, game, UI, audio, sound bank, asset, dependency, network call, Preview output or protected port changed. This freeze grants no source implementation, lane/full/build, browser, listening, release or whole-card pass. The Director releases the next source owner and exact gates after the clean tests-only handoff.

### Removed — flag-boundary tests

Replaced only the reviewed catalog expectation that the real switch dictionary has exactly eight entries. The same eight entries and every old release/retirement/Fuel assertion remain; the ninth required dev entry is explicit. No test, script, replay fingerprint, runtime path, source, licensed original, asset or player data was removed. Ignored raw RED logs are retained until their verdict is consumed.


## Covered native partial source: 1 October 2026

Built on clean tests-first lane `71fcb5d8ee737659d5371d7b1a765265720be74d`, with the normal integration merge retained. Board hook grant `e0b7fff` and the Director's narrowed follow-up authorize this partial slice. Frozen core/save assertions, fixtures, helpers and pins remain unchanged.

The real registry now contains L0 Oil and Smoke, with recharge of 10 and 14 seconds. Arsenal starts in dev, and both the race view and the launch boundary require the player's recorded discovery and enabled Wasteland/Arsenal switches. The player launch path creates the reviewed real hazard, rejects deployment during recharge and respects the shared disabled effect. The driving boundary respects disabled boost while retaining ordinary acceleration and driving. Hazard and effect updates run from the real combat fixed step only when Arsenal is active; existing pickup/AI/projectile order stays intact. Effects age before new contacts, so a new contact receives its full authored duration.

Stage/arena replacement clears the existing actors before replacing them. Actual terminal events (stageResult, gameover, arenaResult, menu, complete) clear hazards and each current car's private timed effects. No transient Arsenal field is added to sampled race state or a profile. No inactive RNG is consumed. The game's default slots and the existing starter upgrade/HUD enumerations now use the four WEAPON_IDS explicitly, so adding registry entries does not expose incomplete controls or alter an Arsenal-off loadout. The Preview launcher source requests Arsenal; the launcher was never executed.

This is partial source, not a completed feature. New CPU rear deployment remains rejected at the shared launch boundary until the separate per-CPU recharge and scheduler consumer slice is independently frozen. Native seeded CPU loadouts, road/arena Oil spin and avoidance, real road hit history/reset, bound App purchase/equip/UI admission, hazard visuals, context-dependent targeting and upgraded recharge remain pending. The Director reports Claude's written context and upgrade answers at integration e5a9490; their implementation still waits for frozen consumer acceptance and the held context-file grant. Audio dispatch and protected bank cues remain pending; no substitute cue is used or counted complete. The reviewed five core modules and all three pure save hooks remain byte-identical.

### Checks and remaining REDs

- Independent frozen baseline recorded 13 native failures and three design TODOs. The unchanged combined command `node --test --test-reporter=tap tools/test-arsenal-core.mjs tools/test-arsenal-save.mjs` now reports **162 cases: 150 pass, nine fail, three TODO**, reaching **498 core and 602 save checks**. Four actual integration cases newly pass: dev/discovery view, player deploy/recharge/disabled launch, disabled native driving and new-weapon admission. All **98 save cases/602 checks** pass.
- The nine failures are eight held native CPU/targeting consumers plus one invalid lifecycle fixture. That fixture calls `_finishStage()` with completedLaps=0 and s=500. The genuine finish method requires completed laps and the finish position, returns false and emits no terminal. Its cleanup assertion therefore remains RED. The Director approved preserving this successful-finish guard and requested independent fixture review; no assertion or fixture was edited here.
- A memory-only genuine finish witness checks nine conditions: an unsuccessful native finish preserves the hazard/effect and emits no terminal; after setting completedLaps=lapsTotal and s=duel.raceLength, the same method returns true, emits stageResult, reaches stage_result and clears both. This supports the real lifecycle behavior; it does not substitute for correcting and rerunning the independent frozen fixture.
- `node --test --test-name-pattern '^CORE:' --test-reporter=tap tools/test-arsenal-core.mjs`: **48/48, exactly 449 checks** pass. The reviewed body orientation and actual walking-fighter sightlines stay unchanged.
- Sixteen unchanged native control suites pass **117/117 TAP cases**: feature flags, Wasteland beta, combat, projectiles, projectile order, opponents, field shields, pickups2, car loadouts, weapon upgrades, combat HUD, effects, modules, on-foot hints, arena events and the Wasteland easter egg. Feature flags retain **32 checks** and on-foot hints retain **15/15** and their original full-state pin. The enclosing shell's trailing rg produced exit 1 because no failure text was found; the TAP report itself has fail=0.
- `node tools/test-replays.mjs`: **162/162 unchanged fingerprints** across 18 cases, 16 events, eight categories, three presentation frame rates and three runs.
- `npm run build`: passes in the isolated lane's regular dist; the existing large-chunk warning remains. No Preview/live output was touched.

Private logs are under ignored `.evidence/2026-10-01/ARS-CORE/native-partial/`. No heavy lane/full gate, browser, new Arsenal replay, balance, save-budget expansion, frame pacing, visual review or audio clearance is claimed. Whole-card review, Save Guardian, Claude review and exact lane/build gates remain the Director's next steps after the missing consumers are built. Changed tests/assertions/fixtures/pins: **none**.

### Source freeze hashes

| File | SHA-256 |
| --- | --- |
| src/combat-weapons.js | f25d4fc37671f561d98d3fbf347885d4209c3ec8469ca1bb597cccdfacea44fe |
| src/combat.js | 8b052345ac7e27b1df7577a8c98af8c0ace85bca83de5a34c72cbb3939d60eee |
| src/feature-flags.js | 5b4921d09daf7f264df71f14a61c90b245c0f42bd5a4868358d32777fc1ba335 |
| src/game.js | 54f5445a4cbade43fe328f42f8ff783c3137f0953defb27f36e50597b1daa8fa |
| src/screen-armory.js | 2d9481e1fdbf474684a0952800f54e582bc7966a2e5a7b6c3f599073528138c7 |
| src/screen-router.js | f571b2c7c2e8872ef01c0441763b81541ca9032318e28eea672fa142e57e224a |
| src/sim-driving.js | 532b73b0f218f33600753248f0eda107366da529564f0907931337d7df11f56a |
| src/wasteland-access.js | fbab76a6f6ce0956e482c8e98d1646cd2358f053798b9eefd6b6c6525e288c3b |
| src/wasteland-tuning.js | 426e9a05d3d4e5e08e7e43a1db1d5020889fd31fb9009cd0d492c0d240b17e7f |
| start-preview.bat | 0a0f2a058afc7cbad0fee4560eaf6cf90679ac15278e83ba49bb67ac1a76f55f |
| Unchanged tools/test-arsenal-core.mjs | fcbf6e253bad37c5aacbd5c688304c222be5ffeca36bc673e468fc4ce571c210 |
| Unchanged tools/test-arsenal-save.mjs | 54480590357b34f190dc2ce8f713ccb420ece5a959480ade437254ecb5f6b945 |
| Unchanged src/weapon-upgrades.js | 6b5f76ac6d537b9b80986cf11bbaea59142fc202cb4da8736707d999489a8cc8 |
| Unchanged src/car-loadout.js | e20d84276b5d8c5e5e45629579a306db220354278eff16ea88fdf7c9600d918e |
| Unchanged src/wasteland-progress.js | 40e9934fbbc5bf19f1d00ce28692330653d3ceb13c1b67aa344987ec0c4eac6f |
| Unchanged held src/combat-projectiles.js | f36e7c9b109a72e15d0dc2b36ce05451a9ba0cffcbfd6fccdc78c63e3cad4747 |
| Unchanged held src/onfoot-weapons.js | 8161e2dd90ab26cf61c32e26a131a3d64e7849b0f5db5dc5a9a7dda33fd1c922 |

### Removed

Replaced registry-wide default-slot, starter-upgrade and initial HUD enumeration with the explicit existing four starters in the same change. Removed the packed first registry line while retaining all existing starter values. No old gameplay, test, fixture, replay, licensed source, asset or protected audio was removed or replaced. The limited player L0 launch and CPU hold will be completed by the independently tested native consumer slice on this same card; no parallel implementation or fallback was added. The Preview source-only flag change does not remove or rebuild Preview output. Save hooks and the existing core modules were preserved.

## Independent native consumer acceptance freeze — 1 October 2026

This is tests-first acceptance for the held ARS-CORE consumers. Production sources remain unchanged. The lane first merged integration/wasteland 0f934845 normally, bringing Claude's e5a9490 answers into merge commit 7c2d7eed17164ba6e2509718ddd9c75911169a9f. No history was rewritten. This freeze does not complete ARS-CORE or grant a merge/release pass.

### Approved changes and preservation

The reviewer-approved finish fixture now sets completedLaps=lapsTotal and s=duel.raceLength before calling the actual _finishStage(). It checks the true return, genuine stage_result, exactly one successful stageResult with the actual results object, and completion. Every existing hazard/effect/new-stage cleanup assertion remains byte-exact. The corrected legal finish and cleanup **pass**; this measured result supersedes the earlier narrower probe. An independent refused-finish control uses the original s=500/zero-lap progress, checks false/no event, complete native state, hazard identity/fields and complete effect preservation.

Only the three authorized design TODOs were replaced. The two decoy TODOs now execute genuine native CPU launch/crossbow flight against explicitly labelled decoy actor DATA; the upgrade TODO becomes eight actual Oil/Smoke launch cases at levels 0–3, including fixed control radius/lifetime/grip/spin and the settled recharge division. New native acceptance is in tools/test-arsenal-runtime.mjs. Existing helpers, assertions, fixtures and replay pins remain unchanged. The rest of the original core file reconstructs **exactly 35,677 bytes**, SHA-256 fcbf6e253bad37c5aacbd5c688304c222be5ffeca36bc673e468fc4ce571c210, after reversing only the authorized finish/TODO blocks and removing appended checks. The untouched save file retains SHA-256 54480590357b34f190dc2ce8f713ccb420ece5a959480ade437254ecb5f6b945.

### Shared decoy DATA contract and settled contexts

The Director corrected the temporary auxiliary-list proposal before freeze to respect Claude's existing SCRAPDOME section 5: a decoy is a **genuine initialized NPC actor** in state.opponents and, in arenas, its corresponding real state.arena.participants record, both flagged decoy:true. The fixture borrows an actual initialized native NPC/participant from another genuine Duel; it supplies explicit metadata rather than inventing a producer or mocking targetFor. Unique id, ownerId, existing car, s/lateral/headingError, active and expiresAt metadata identify the future producer's record. Owner identity is player, actual arenaId, or road cpu:<opponents index>. Active expiry is measured against real stageTimeSec; same-owner/team, inactive, expired and out-of-range records cannot draw hostile aim. Combat damage owner strings remain unchanged. Native course/point conversion supplies the position. Fight DATA may be in serialized race state; the memory-only actual App saver/player round trip proves that it does **not enter player saves**. No auxiliary duel.arsenalDecoys field or playable Mirage/Drone is claimed.

Minimal correction from the Director's temporary contract: new setup appends a genuine initialized flagged actor/participant instead of an auxiliary array; flag assertions use decoy:true; lifecycle assertions require removal of flagged transient actors; the no-race-serialization assertion was replaced with the genuine named-save isolation check. Native resolver, launch, flight, lock, range and current-origin assertions are retained.

Claude's actual optional target context is {range, origin, lockedTargetId}: supplied caller range, actual current projectile/fighter origin, stable intended identity, no change to another real car, allowed hostile live decoy redirection and smoke break. Native CPU direct/scheduled shots, player/CPU bolts, real F-exit plus 360 fixed-step camera-left sprint RPG locks, and actual fired RPG guidance exercise the real consumers. A paired genuine no-decoy RPG flight prevents ordinary steering from satisfying the redirection case. Native walking speed in this new fixture moves 22.5 metres; the fixture requires more than 20 metres so parked-car-only and six-metre fighter smoke are physically distinct. The frozen original moved-fighter checks remain unchanged.

Upgrades use recharge / 1.15**level and damaging weapons add 15% damage per level. Oil/Smoke control duration, grip and spin never scale. Actual fixed-step native road driving and arena pilot/brain APIs test player/CPU grip, real pool contact/spin, shield/denial controls and visible-oil avoidance. Actual road/arena armor hits supply the smoke history fixture; no private history helper or fake event supplies eligibility.

### Native UI, storage and presentation boundaries

App purchase/equip/upgrade tests use the actual bound methods, actual saved named profiles and the genuine production hooks. purchaseArsenalWeapon(id) is the explicit new bound App acceptance boundary for the existing pure purchaseArsenalWeapon hook. The native screen factory receives the Arsenal admission callback and must provide an actual weapon offer/buy button, exact 400-scrap cost, owned-slot options and upgrade action. Rank/dev/discovery/unimplemented/racing refusals preserve raw bytes, unknown/future fields and the other named player. Already-owned upgrades and already-saved equipped-slot launches are independent cases, so a failed new purchase cannot hide those missing consumers. Synthetic localStorage/cancelAnimationFrame belong only to this Node process and are restored; only audio unlock is silenced. All gameplay, profile saves and UI presenter methods are genuine.

CPU acceptance covers native four unique slots for every real CPU, all three difficulties and ranks 1/2/6, seed repetition, existing seeded traffic continuation, closed-switch starter-only control, actual multi-seed rank-six growth, independent per-CPU recharge and settled Oil/Smoke trigger conditions.

Combat-scene acceptance inspects actual THREE geometry, world bounds, visibility, geometry/material reuse and disposal at the shared 24-hazard bound. Repeated genuine presentation updates preserve complete state, hazards, effects, emitted events and Course RNG continuation. Unrelated fighter asset loading is inactive in these hazard-specific fixtures. No copied geometry/count report, renderer screenshot, art score, frame pacing or sound verdict is substituted. Actual DOM click routing/browser appearance, audio, balance, frame pacing and whole-card review remain later gates; native screen output and bound App action checks do not claim those browser checks.

### Commands and measured verdict

- node --test --test-reporter=tap tools/test-arsenal-core.mjs tools/test-arsenal-runtime.mjs tools/test-arsenal-save.mjs: **exit 1; 301 cases, 202 pass, 99 fail, zero TODO/skipped**. Checks reached: core **592**, runtime **466**, save **602**. All failures are assertion failures for the held consumers; none is an undefined API fixture, syntax error, missing native menu method or other accidental test exception. Missing bound purchaseArsenalWeapon is explicitly asserted as a required consumer boundary.
- node --test --test-name-pattern '^CORE:' --test-reporter=tap tools/test-arsenal-core.mjs: **48/48, exactly 449 checks, exit 0**. Existing protected core controls remain unchanged.
- node --test --test-reporter=tap tools/test-arsenal-save.mjs: **98/98, 602 checks, exit 0**, unchanged source/tests.
- node tools/test-replays.mjs: **162/162 unchanged fingerprints**, 18 cases, 16 events, eight categories, three FPS values, three runs; exit 0. No replay pin was regenerated or changed.
- node --check tools/test-arsenal-runtime.mjs and git diff --check: pass.

Full raw final TAP and the exact per-failure JSON are retained privately at .evidence/2026-10-01/ARS-CORE/native-consumer-tests-red/final.tap and failures.json, alongside the frozen-control and replay outputs. No lane/full/build/browser/audio/art/save-budget gate is claimed by this tests-only freeze. The Director owns subsequent source implementation, review, lane/build gates and integration.

### RED groups and each failure message

| Native group | RED cases |
| --- | ---: |
| INTEGRATION | 8 |
| SETTLED DECOY DATA | 2 |
| SETTLED UPGRADE | 6 |
| NATIVE HISTORY | 5 |
| NATIVE APP | 4 |
| NATIVE APP CONTROL | 10 |
| NATIVE CPU | 9 |
| NATIVE CPU RECHARGE | 4 |
| NATIVE CPU CONDITION | 4 |
| NATIVE DRIVING | 4 |
| NATIVE AVOIDANCE | 4 |
| SETTLED NATIVE UPGRADE | 9 |
| NATIVE PRESENTATION | 2 |
| SHARED DECOY DATA | 2 |
| SHARED TARGET CONTEXT | 4 |
| NATIVE DECOY SHOT | 2 |
| NATIVE BOLT CONTEXT | 4 |
| NATIVE MOVED RPG LOCK | 2 |
| NATIVE RPG GUIDANCE | 2 |
| SHARED DECOY LIFECYCLE | 1 |
| NATIVE ARMORY VIEW | 4 |
| NATIVE APP UPGRADE | 2 |
| NATIVE APP LAUNCH | 2 |
| NATIVE CPU GROWTH | 1 |
| SHARED DECOY TERMINAL | 2 |

Each row below records the exact first failure message; complete assertion values/stacks remain in the raw TAP.

| Case | Failure message |
| --- | --- |
| INTEGRATION: a real scheduled CPU shot cannot bypass smoke | INTEGRATION: native scheduled CPU aimed fire must route through smoke targeting |
| INTEGRATION: direct native CPU launch cannot bypass smoke while player straight fire remains legal | INTEGRATION: direct native CPU aimed launch must respect the same smoke targetFor |
| INTEGRATION: an actual fired crossbow stops homing while smoke interrupts its line | INTEGRATION: native homing cannot bypass an intervening smoke cloud: -1.0786663763034925 versus -1.09175634569345 |
| INTEGRATION: real fighter RPG lock breaks and fired RPG guidance stops in smoke | INTEGRATION: native RPG lock must break inside smoke |
| INTEGRATION: native CPU weapon scheduler really deploys equipped oil | INTEGRATION: a real CPU with oil equipped must use it at the settled rear-enemy trigger |
| INTEGRATION: a native CPU bolt cannot home through smoke | INTEGRATION: native CPU crossbow homing is disabled by smoke x: 179.76694051323733 versus 178.6041374884129 |
| INTEGRATION: native fired RPG homing independently cannot bypass smoke | INTEGRATION: native fired RPG guidance respects smoke independently of lock update x: -50.38620422078649 versus -50.65712160310798 |
| SETTLED DECOY DATA: actual CPU shot aims at a live hostile record | native CPU launch aims at genuine course conversion of live decoy DATA: 0.197565267528645 versus 0 |
| SETTLED DECOY DATA: native crossbow flight redirects from its real current origin | genuine in-flight crossbow steers toward live hostile decoy DATA |
| SETTLED UPGRADE: actual oil level 1 | settled recharge divides by 1.15 once per level: 10 versus 8.695652173913045 |
| SETTLED UPGRADE: actual oil level 2 | settled recharge divides by 1.15 once per level: 10 versus 7.561436672967865 |
| SETTLED UPGRADE: actual oil level 3 | settled recharge divides by 1.15 once per level: 10 versus 6.575162324319883 |
| SETTLED UPGRADE: actual smoke level 1 | settled recharge divides by 1.15 once per level: 14 versus 12.173913043478262 |
| SETTLED UPGRADE: actual smoke level 2 | settled recharge divides by 1.15 once per level: 14 versus 10.586011342155011 |
| SETTLED UPGRADE: actual smoke level 3 | settled recharge divides by 1.15 once per level: 14 versus 9.205227254047836 |
| INTEGRATION: native CPU scheduler really deploys smoke after a recent native hit | INTEGRATION: native CPU with smoke equipped uses it after the settled real-hit trigger |
| NATIVE HISTORY: positive owned armor hit admits smoke on road | actual owned armor hit admits native defensive smoke |
| NATIVE HISTORY: hit eligibility expires by five-seconds on road | native positive hit qualification must work before checking cleanup |
| NATIVE HISTORY: hit eligibility expires by stage on road | native positive hit qualification must work before checking cleanup |
| NATIVE HISTORY: hit eligibility expires by recovery on road | native positive hit qualification must work before checking cleanup |
| NATIVE HISTORY: hit eligibility expires by recovery on arena | genuine expiry/stage/recovery clears previous defensive hit eligibility |
| NATIVE APP: purchase, equip and three upgrades of oil preserve the named registry | native App must expose purchaseArsenalWeapon for the actual Armory action |
| NATIVE APP CONTROL: rank denies bound oil purchase without a write | native App must expose purchaseArsenalWeapon for the actual Armory action |
| NATIVE APP CONTROL: dev denies bound oil purchase without a write | native App must expose purchaseArsenalWeapon for the actual Armory action |
| NATIVE APP CONTROL: discovery denies bound oil purchase without a write | native App must expose purchaseArsenalWeapon for the actual Armory action |
| NATIVE APP CONTROL: implementation denies bound oil purchase without a write | native App must expose purchaseArsenalWeapon for the actual Armory action |
| NATIVE APP CONTROL: race denies bound oil purchase without a write | native App must expose purchaseArsenalWeapon for the actual Armory action |
| NATIVE APP: owned oil equip/upgrade and actual launch respect dev=true | native equip follows actual feature admission |
| NATIVE APP: purchase, equip and three upgrades of smoke preserve the named registry | native App must expose purchaseArsenalWeapon for the actual Armory action |
| NATIVE APP CONTROL: rank denies bound smoke purchase without a write | native App must expose purchaseArsenalWeapon for the actual Armory action |
| NATIVE APP CONTROL: dev denies bound smoke purchase without a write | native App must expose purchaseArsenalWeapon for the actual Armory action |
| NATIVE APP CONTROL: discovery denies bound smoke purchase without a write | native App must expose purchaseArsenalWeapon for the actual Armory action |
| NATIVE APP CONTROL: implementation denies bound smoke purchase without a write | native App must expose purchaseArsenalWeapon for the actual Armory action |
| NATIVE APP CONTROL: race denies bound smoke purchase without a write | native App must expose purchaseArsenalWeapon for the actual Armory action |
| NATIVE APP: owned smoke equip/upgrade and actual launch respect dev=true | native equip follows actual feature admission |
| NATIVE CPU: deterministic four-slot native loadouts at rank 1 easy | every real CPU actor receives a native weaponLoadout |
| NATIVE CPU: deterministic four-slot native loadouts at rank 1 medium | every real CPU actor receives a native weaponLoadout |
| NATIVE CPU: deterministic four-slot native loadouts at rank 1 hard | every real CPU actor receives a native weaponLoadout |
| NATIVE CPU: deterministic four-slot native loadouts at rank 2 easy | every real CPU actor receives a native weaponLoadout |
| NATIVE CPU: deterministic four-slot native loadouts at rank 2 medium | every real CPU actor receives a native weaponLoadout |
| NATIVE CPU: deterministic four-slot native loadouts at rank 2 hard | every real CPU actor receives a native weaponLoadout |
| NATIVE CPU: deterministic four-slot native loadouts at rank 6 easy | every real CPU actor receives a native weaponLoadout |
| NATIVE CPU: deterministic four-slot native loadouts at rank 6 medium | every real CPU actor receives a native weaponLoadout |
| NATIVE CPU: deterministic four-slot native loadouts at rank 6 hard | every real CPU actor receives a native weaponLoadout |
| NATIVE CPU RECHARGE: separate real oil timers on road | first actual CPU rear weapon launches |
| NATIVE CPU CONDITION: oil rear trigger=true on road | actual equipped CPU scheduler uses the settled enemy-behind trigger |
| NATIVE CPU RECHARGE: separate real smoke timers on road | first actual CPU rear weapon launches |
| NATIVE CPU CONDITION: smoke rear trigger=true on road | actual equipped CPU scheduler uses the settled enemy-behind trigger |
| NATIVE CPU RECHARGE: separate real oil timers on arena | first actual CPU rear weapon launches |
| NATIVE CPU CONDITION: oil rear trigger=true on arena | actual equipped CPU scheduler uses the settled enemy-behind trigger |
| NATIVE CPU RECHARGE: separate real smoke timers on arena | first actual CPU rear weapon launches |
| NATIVE CPU CONDITION: smoke rear trigger=true on arena | actual equipped CPU scheduler uses the settled enemy-behind trigger |
| NATIVE DRIVING: actual slick changes player fixed-step grip on road | genuine driving consumer changes its physical trajectory while slick is active |
| NATIVE DRIVING: actual slick changes cpu fixed-step grip on road | genuine driving consumer changes its physical trajectory while slick is active |
| NATIVE DRIVING: actual slick changes player fixed-step grip on arena | genuine driving consumer changes its physical trajectory while slick is active |
| NATIVE DRIVING: actual slick changes cpu fixed-step grip on arena | genuine driving consumer changes its physical trajectory while slick is active |
| NATIVE AVOIDANCE: real CPU medium trajectory responds to visible oil on road | Medium/Hard native steering really changes course to avoid visible oil |
| NATIVE AVOIDANCE: real CPU hard trajectory responds to visible oil on road | Medium/Hard native steering really changes course to avoid visible oil |
| NATIVE AVOIDANCE: real CPU medium trajectory responds to visible oil on arena | Medium/Hard native steering really changes course to avoid visible oil |
| NATIVE AVOIDANCE: real CPU hard trajectory responds to visible oil on arena | Medium/Hard native steering really changes course to avoid visible oil |
| SETTLED NATIVE UPGRADE: bomb level 1 recharge and damage | actual upgraded recharge uses the settled exponential division: 7.6499999999999995 versus 7.82608695652174 |
| SETTLED NATIVE UPGRADE: crossbow level 1 recharge and damage | actual upgraded recharge uses the settled exponential division: 3.4 versus 3.4782608695652177 |
| SETTLED NATIVE UPGRADE: star level 1 recharge and damage | actual upgraded recharge uses the settled exponential division: 13.6 versus 13.913043478260871 |
| SETTLED NATIVE UPGRADE: bomb level 2 recharge and damage | actual upgraded recharge uses the settled exponential division: 6.3 versus 6.8052930056710785 |
| SETTLED NATIVE UPGRADE: crossbow level 2 recharge and damage | actual upgraded recharge uses the settled exponential division: 2.8 versus 3.024574669187146 |
| SETTLED NATIVE UPGRADE: star level 2 recharge and damage | actual upgraded recharge uses the settled exponential division: 11.2 versus 12.098298676748584 |
| SETTLED NATIVE UPGRADE: bomb level 3 recharge and damage | actual upgraded recharge uses the settled exponential division: 4.95 versus 5.917646091887894 |
| SETTLED NATIVE UPGRADE: crossbow level 3 recharge and damage | actual upgraded recharge uses the settled exponential division: 2.2 versus 2.6300649297279532 |
| SETTLED NATIVE UPGRADE: star level 3 recharge and damage | actual upgraded recharge uses the settled exponential division: 8.8 versus 10.520259718911813 |
| NATIVE PRESENTATION: oil is visible, bounded, read-only and disposed | actual native oil hazard exposes nonempty visible geometry |
| NATIVE PRESENTATION: smoke is visible, bounded, read-only and disposed | actual native smoke hazard exposes nonempty visible geometry |
| SHARED DECOY DATA: actual resolver live on road | genuine resolver selects only a live hostile decoy within this attack range |
| SHARED TARGET CONTEXT: actual weapon range and supplied current origin on road | resolver excludes a target beyond the exact caller range |
| SHARED TARGET CONTEXT: intended real target cannot switch to a nearer real car on road | genuine resolver preserves intended real target despite a nearer enemy |
| SHARED DECOY DATA: actual resolver live on arena | genuine resolver selects only a live hostile decoy within this attack range |
| SHARED TARGET CONTEXT: actual weapon range and supplied current origin on arena | resolver excludes a target beyond the exact caller range |
| SHARED TARGET CONTEXT: intended real target cannot switch to a nearer real car on arena | genuine resolver preserves intended real target despite a nearer enemy |
| NATIVE DECOY SHOT: actual scheduled CPU crossbow aims at live DATA | actual CPU launch bearing aims at decoy DATA rather than the real player |
| NATIVE DECOY SHOT: actual direct CPU crossbow aims at live DATA | actual CPU launch bearing aims at decoy DATA rather than the real player |
| NATIVE BOLT CONTEXT: player in-flight origin-smoke | native in-flight bolt reads smoke at its current projectile origin x: -176.26568961842156 versus -177.4875661406689 |
| NATIVE BOLT CONTEXT: player in-flight decoy | actual native in-flight bolt steers toward the qualifying decoy DATA |
| NATIVE BOLT CONTEXT: CPU in-flight origin-smoke | native in-flight bolt reads smoke at its current projectile origin x: 179.46545981012562 versus 178.29462475594036 |
| NATIVE BOLT CONTEXT: CPU in-flight decoy | actual native in-flight bolt steers toward the qualifying decoy DATA |
| NATIVE MOVED RPG LOCK: actual lock from current walking fighter with fighter-smoke | actual native lock breaks when current fighter ray is smoked or target leaves range |
| NATIVE MOVED RPG LOCK: actual lock from current walking fighter with decoy | native RPG carries the stable decoy identity rather than a real-car-only index |
| NATIVE RPG GUIDANCE: actual fired projectile origin-smoke | genuine RPG guidance breaks at its current projectile smoke origin x: -50.91265943913013 versus -51.16786107472422 |
| NATIVE RPG GUIDANCE: actual fired projectile decoy | actual RPG decoy guidance differs from genuine no-decoy flight; ordinary steering cannot satisfy this case |
| SHARED DECOY LIFECYCLE: actual menu transition clears transient DATA | genuine lifecycle removes transient flagged decoy actors |
| NATIVE ARMORY VIEW: oil offer/equip admission=eligible | genuine Armory renders the newly eligible weapon offer |
| NATIVE ARMORY VIEW: oil offer/equip admission=owned | actual Armory offers owned Arsenal weapon for equip |
| NATIVE ARMORY VIEW: smoke offer/equip admission=eligible | genuine Armory renders the newly eligible weapon offer |
| NATIVE ARMORY VIEW: smoke offer/equip admission=owned | actual Armory offers owned Arsenal weapon for equip |
| NATIVE APP UPGRADE: already-owned oil upgrades without needing an equip action | actual bound already-owned Arsenal upgrade succeeds |
| NATIVE APP LAUNCH: an already-saved earned oil slot survives actual App-to-Duel launch | actual native launch admits the already-owned implemented saved Arsenal slot |
| NATIVE APP UPGRADE: already-owned smoke upgrades without needing an equip action | actual bound already-owned Arsenal upgrade succeeds |
| NATIVE APP LAUNCH: an already-saved earned smoke slot survives actual App-to-Duel launch | actual native launch admits the already-owned implemented saved Arsenal slot |
| NATIVE CPU GROWTH: actual seeded rank-six launches use both implemented wave-one weapons | actual seeded CPU growth requires native assigned slots |
| SHARED DECOY TERMINAL: genuine legal race finish clears transient DATA | native terminal event clears transient flagged decoy actors without a fake emit |
| SHARED DECOY TERMINAL: genuine arena result clears transient DATA | native terminal event clears transient flagged decoy actors without a fake emit |

### Removed

Replaced the invalid successful-finish setup and three settled design TODOs in this same tests-only change. Removed the Director’s superseded auxiliary decoy-list proposal from the new fixtures; the frozen tests use Claude’s native actor/participant flag. No production code, asset, licensed source, existing test assertion, save test, replay fixture, launcher, audio or source catalog was removed or edited. The real source consumer slice on this card replaces the held paths after this acceptance is frozen.


## Native consumer Source continuation — provisional freeze, 1 October 2026

This is a source review handoff, not a finished card or a merge pass. The unchanged
301-case acceptance now reports **300 pass, one fail, zero skips and zero TODOs**.
The retained RED needs independent native fixture review. A separate real
Crossbow range-context design limit is held. The Director requires independent
fixture/source/range regression review before continuation.

### Starting point and scope

Started from clean test freeze 25e0d3403c50332b571ec7abbe3ce8f8ff580d5c.
Normally merged integration 1498b33c2c4d85903db2002a11da6583d35f64bb, producing
clean lane commit 3af31db5adf7230637dba2de48a8903f4e7cb83d. Fuel, steering,
Claude's designs and reviewed pure Arsenal/save code were preserved. No conflict
fix, rebase, history rewrite or integration merge was made here.

Only Director-granted source consumers below and this append-only note changed.
All tests, fixture configurations and replay pins remain unchanged. Shove's
event/floor/contacts/collision/knock, Salt's course/venues, render3d, protected
audio/bank, assets and source catalogs were not edited.

### Native behavior

- Positive hostile armor removal records private per-fight/per-actor hit history.
  Zero, shielded, protected and friendly damage do not qualify Smoke. Eligibility
  lasts through exactly five seconds and clears at actual reset/recovery/fight
  boundaries. Existing damage-owner strings remain unchanged.
- Each real CPU receives four unique eligible implemented weapons from rank using
  a separate seeded generator. Real scheduled Oil/Smoke use follows settled rear
  enemy/recent-hit conditions, with separate per-actor recharge timers.
- Player road/arena and both CPU driving paths read timed grip. Road CPU oil spin
  changes actual heading; Medium/Hard physically steer around visible oil within
  the settled perception range. Easy stays unchanged. No teleport or target pose.
- Actual bound App calls pass discovery/dev/Wasteland options and rank. Existing
  pure functions handle 400-scrap purchase, equip and 150/300/600 upgrades. Genuine
  Armory HTML exposes eligible offers and owned equip/upgrades. Named-owner,
  unknown fields, future identities/levels/slots and no-write refusals stay green.
- Scheduled CPU selection, direct Crossbow launch, fired bolt guidance, walking
  RPG lock and fired RPG guidance call the shared resolver with current origin
  and stable native identity. Existing locks never choose another real car.
  Qualifying decoys redirect; Smoke breaks guidance, including enemy endpoint
  half-steps. Player straight fire through Smoke remains legal.
- Decoy DATA uses actual native NPC/arena participant records with owner/active/
  expiry metadata. No Mirage/Drone producer, auxiliary decoy list or future fight
  rules were built. Legal results/menu/stage clear transient flagged actors;
  refused finish does not.
- Recharge is cooldown / 1.15**level; existing armor damage already supplies +15%
  per level. Oil control strength/duration and Smoke lifetime do not scale.
- Actual native Oil disks and Smoke volumes use a preallocated 24-entry geometry/
  material pool. Updates are read-only, bounded, consume no simulation RNG, reuse
  resources and dispose owned resources exactly once.

### Exact validation

Default command: node --test tools/test-arsenal-core.mjs tools/test-arsenal-save.mjs tools/test-arsenal-runtime.mjs.

| Check | Result |
| --- | --- |
| Frozen default 301 cases | Baseline 202 pass/99 RED; now 300 pass/one retained RED. Zero skips/TODOs. |
| Complete CORE | 72/72; 598 acceptance checks. |
| Original CORE subset | 48/48; exactly 449 checks. |
| Complete SAVE | 98/98; exactly 602 checks. |
| Original SAVE subset | 68/68; exactly 451 checks. |
| Native runtime | 130/131; 771 checks reached including disputed assertion. |
| Ordinary replay pins | 162/162 unchanged; 18 cases, 16 events, eight categories, three frame rates, three runs. |
| Combat replay pins | 12/12 unchanged across four encounters. |
| Existing source regressions | 32 unchanged scripts all exit zero. |
| npm run build | Pass in the isolated lane, normal dist only; existing advisory chunk warning. |
| git diff --check/source LF | Pass. |

The 32 regressions cover upgrades/loadouts, damaged profile fields, historical
save fixtures, Wasteland profiles, progression/named registry; combat, armor,
projectile motion/ordering, CPU brain, pickups/field shields, on-foot weapons/
race, scoring/opponents; road/combat replays, NPC routes/yielding, standing Fuel
carrier/attribution, Fuel Run/depot and steering; career/storage budgets, feature
flags, Wasteland beta and repository placement. NPC route reports 16,755 checks;
yielding reports 43,174 checks. Private raw logs, hashes and geometry witness:
.evidence/2026-10-01/ARS-CORE/native-consumer-build/.

### Retained native geometry RED

The frozen runtime case "SHARED DECOY DATA: actual resolver out-of-range on arena"
places CPU s=540 and decoy s=940, lateral=0, on the actual 480 m Scrapdome circuit,
seed 1989. Native CPU world point is (-35.129535363953366, 44.7878291227254);
decoy is (-5.442488544529219, -18.96501939013382). Actual planar distance is
**70.32600118279339 m**, inside the caller's **180 m** range. Correct source
selects the live hostile decoy; the frozen assertion expects the real player.

The Director confirmed this closed-course fixture problem and requires author/
reviewer resolution. The assertion remains RED and unchanged. No unwrapped-s
range rule, fixture-name detection, replacement geometry or weakened range
check was added. Exact private witness: closed-arena-range-witness.json.

### Held Crossbow range question and outstanding acceptance

The Director confirmed that released tuning gives only CPU acquisition a 180 m
cap. Player Crossbow acquisition/homing has no explicit cap. Existing bolt
settings are 200 + 30/level m/s, 2.5 s lifetime and inherited world velocity with
Wasteland2. A common 180 m context at player/in-flight routes could shorten that
released reach. This provisional source currently uses it at those new resolver
calls; **it is not settled and must not ship**. The Director is asking Claude in
writing for the precise existing-weapon values/formula. No invented cap is an
authorized solution. Independent native range regressions precede continuation.

Source/reviewer and Save Guardian review, range settlement/tests, exact lane/
build gates, retained Arsenal replay, balance, browser/DOM/game presentation and
frame checks remain before merge. No lane/full-tier, whole-card or release pass.
Protected audio/bank hooks remain requests; settled cues are weapon.oil.deploy,
weapon.oil.slip and weapon.smoke.deploy. Generic weapon.fire fallback is not
finished audio. No listening or audio-integration clearance is claimed.

### Exact source and protected bytes

SHA-256 hashes below cover this provisional review freeze. Unchanged files were
compared directly against Git bytes on the normal integration merge commit.

| Path | SHA-256 |
| --- | --- |
| src/app.js | b73b90c1c9202e62ce1a7a59f254076f0f73b33e99d5b56b9f91aabc328c9970 |
| src/arena/arena-pilot.js | 20141483434d16d0ab45443cc9c6199b832ea57cfb08d6150ab31cf42659fc7d |
| src/arsenal/car-effects.js | 4f7d3842234172ab8422c46797f45eb5e3f6bb0f39b4485f615f4db1075512cb |
| src/arsenal/smoke.js | c7a10f24ea6082092a04dd2e69566c1ec7afb55be2239e91faf0a2ea789de7cf |
| src/arsenal/targeting.js | 020625e24a75cd7846675b3e665d63c3a19a78f4541105ca641e1c329d1da189 |
| src/combat-ai.js | 8037af43a2ac69f822eb8fd2f504cd7e06dc1c6f673bce24765b0bd56c5c7819 |
| src/combat-armor.js | 6e3c8ab02303f2f84e99b606f2e4f6b07ad43e84cd28f9ef6dcc82bcd1e87a30 |
| src/combat-projectiles.js | dccf888a423f4fd2fdc56482699d27dbff6b709358c8701d22bc690a704876b4 |
| src/combat-scene.js | 094d2999017e08fd3f250f6da67662597016840c8834bc4b561751755c3c35a5 |
| src/combat-weapons.js | 745d08116824f622b8d7c0ef869dc386f9f74de9848db022fae9b7a5ccd8026f |
| src/combat.js | 42b12987e2c0131d14a1d20461c5a92cff1a9cbb00124a5f495c808ec4448508 |
| src/game.js | 1e245caf76a59d4e7343856456c10bb7e6fc053f3e671be1735e6cace2fb04af |
| src/onfoot-weapons.js | b1355a487139ec1d759cd0859b5a4e0fd9ee304a1e84b1f740e674b29f728da6 |
| src/screen-armory.js | 28d8127e18ecf346216b51873118196d8886a35b9169e36fc0c89d44d1cc5f46 |
| src/screen-router.js | 75485c6b99cf93ea5dd3decb7dbaf80556271a8ebcac3959dbb9735bca10a99e |
| src/sim-driving.js | 418139dcb7e692868c1c2b886d403e0cd3b3acb94a863aaa7d6d570f5365f21d |
| src/sim-rival.js | f7d23861373833e55050c9ac403e02842e143b53732056a73fc618ab999bb410 |
| Unchanged src/weapon-upgrades.js | 6b5f76ac6d537b9b80986cf11bbaea59142fc202cb4da8736707d999489a8cc8 |
| Unchanged src/car-loadout.js | e20d84276b5d8c5e5e45629579a306db220354278eff16ea88fdf7c9600d918e |
| Unchanged src/wasteland-progress.js | 40e9934fbbc5bf19f1d00ce28692330653d3ceb13c1b67aa344987ec0c4eac6f |
| Unchanged src/wasteland-tuning.js | 426e9a05d3d4e5e08e7e43a1db1d5020889fd31fb9009cd0d492c0d240b17e7f |
| Unchanged src/audio.js | 0ce6602c798a4326da9436219f24b232d16019727f6f1c71b796b32c2f17f56f |
| Unchanged src/sound-bank.js | 7f0ca4e57f609b911183659418da5feac6802e9a2a280935bdaf4726c6e42339 |
| Unchanged src/feature-flags.js | 5b4921d09daf7f264df71f14a61c90b245c0f42bd5a4868358d32777fc1ba335 |
| Unchanged start-preview.bat | 0a0f2a058afc7cbad0fee4560eaf6cf90679ac15278e83ba49bb67ac1a76f55f |
| Unchanged tools/test-arsenal-core.mjs | ca1f275216c643b802ceada5d86967751608356ee7aea1bda4ffeeeed43c541f |
| Unchanged tools/test-arsenal-save.mjs | 54480590357b34f190dc2ce8f713ccb420ece5a959480ade437254ecb5f6b945 |
| Unchanged tools/test-arsenal-runtime.mjs | 6df9f61733bb052f419d65b4317cd44a414a66b34c6087bed8a6ef63be5fb46e |

### Removed — native consumer continuation

Replaced the held CPU rear-weapon refusal, unwired real hit-history reader,
default-only bound Armory calls and bypassing native aimed/lock/homing consumers
in this slice. The old fixed four-entry UI enumeration uses the genuine admitted
owned list. The new pooled presenter owns/disposes its resources without
accumulating render output.

No assertion, fixture, replay pin, reviewed earned-identity/slot rule, pure save
module, runtime binary, licensed source, protected audio, other lane work or real
save was removed or changed. Earlier note sections remain verbatim. Further
Crossbow range replacement belongs to the Director's design/test continuation
before the card may merge.

## Independent reviewed range-fixture and released-consumer freeze — 1 October 2026

Tests only, on unchanged Source 41ed21dfb84bf0b2326ef5cbe32a9ad133447f83. The original 301-case run was reproduced first: **300 pass, one RED**, the arena out-of-range decoy DATA case. The approved arena correction resolves that invalid geometry fixture. Two additive, genuine Crossbow regressions now remain **RED pending Claude**. This does not complete ARS-CORE, approve a new range formula, or clear source/feature/lane/full/browser/audio/release gates.

### Exact approved fixture correction

Reviewer audio_output_source_review and the Director approved only the arena/out-of-range setup/context. The original 480-metre closed arena wraps CPU s540 to s60 and copy s940 to s460. Native positions were CPU (-35.129535364, 44.787829123), copy (-5.442488545, -18.965019390), real owner (-5.442488545, 18.965019390). Copy distance is **70.3260011828 m**, real owner **39.3463880343 m**: the former 180-metre context correctly selected the live copy, making the former expected-real geometry invalid.

Only that negative arena case now places the actual real owner at s20 and CPU at s60 before sampling the origin. The unchanged cpu.s+400 setup supplies a valid native copy at s460. That shared API geometry case uses the **settled Harpoon 50-metre context** from ARSENAL section 3. No Harpoon, CPU-Harpoon shot, future producer or new shared range default is implemented. Every road case and every other arena status retains the original 180-metre context. The strict original status==='live'?data:real selection, failure message and every actor/participant/decoy assertion remain exact.

Three additive genuine geometry controls prove: copy s24 is **35.6002408362 m** away and draws aim inside 50 m; copy s460 is outside 50 m while the real owner stays inside; the s460 copy selects at native current-origin copyDistance+.1 and rejects at copyDistance-.1, keeping the inside real owner. Copies remain inside the actual closed course's bounds. No outside-floor placement or unwrapped-progress shortcut supplies the expected outcome. All ten original shared decoy statuses and all three controls pass.

### Genuine released Crossbow evidence and remaining RED

Two retained **whole native consumer module bodies** are loaded only in memory from integration commit **0f934845b451dc2429efcb574bc9847cc04a1fe5**. Only import routing changes. Imports use genuine current shared native dependencies, and the historical projectile consumer routes its combat-weapons import to the historical whole consumer. Reversing import routing reconstructs each original body byte-exact. This is proof of those actual released consumers against native Duel fixtures, not a complete historical deployment or mocked source behavior.

| Released whole module | Bytes | SHA-256 |
| --- | ---: | --- |
| src/combat-weapons.js | 16,708 | b37efa29b8e9834886ed20dba8cf39a1c469e246608a108a839e030fa4e601ab |
| src/combat-projectiles.js | 22,861 | f36e7c9b109a72e15d0dc2b36ce05451a9ba0cffcbfd6fccdc78c63e3cad4747 |

Actual input: native seed 1989/stage 0 Wasteland road, Falcone player s200/lateral0, real rival s430/lateral0, other CPU s900/lateral5, actual legal road at both actor points, no traffic/hazards, no paused/on-foot/impact/finished actor, no fake resolver or projectile. Fixed step is 1/120 s. The real target changes to lateral1 after the real launch. Native world distance is **229.37782688162793 m**, beyond CPU acquisition 180 m but inside the existing L0 speed/lifetime flight reach. The existing **2.5-second** bolt lifetime and native speed are used only to establish this legal released witness; no new active range equation or cap is proposed.

| Actual native consumer witness | Launched/current horizontal speed (m/s) | Launch heading (rad) | Heading after actual fixed step | Launch/current targetIndex |
| --- | --- | --- | --- | --- |
| Switch off, L0, player carry0 mph | 200.00000000000003 / 200.00000000000003 | -1.0144014219549207 | -1.0100020443345097 | 0 / 0 |
| Switch off, L3, player carry40 mph | 307.65131264062467 / 307.65131264062467 | -1.0048245489479222 | -1.0100020443345097 | 0 / 0 |
| Active provisional Source, L0, carry0 mph | 200 / 200 | -0.8488799316105871 | -0.8488799316105871 | absent / absent |

The mandatory switch-off controls at L0 and L3/carry40 pass. Actual current launch and in-flight x/y/z/vx/vy/vz/age/targetIndex/launchBearing match the genuine retained released consumers exactly, including real homing after the target lane change. Original replay fingerprints are unchanged.

Current Source's exact held route guards: combat-weapons fires the Arsenal branch when arsenalEnabled and weapon==='crossbow', calls targetFor with **T.cpu.attackRange** and the actual actor point, refuses targetless enemy fire, and makes targetless player fire a straight shot. combat-projectiles starts steerBolt only for real crossbow/integer targetIndex/finite launchBearing/positive dt; with arsenalEnabled and no raid, it resolves actual attacker/locked identity from the current projectile origin using the same **T.cpu.attackRange**, then sets targetIndex=null if that resolver returns no target. The released native launch/flight consumers impose no such explicit 180-metre player/homing cap.

The active launch is now independently measured against the genuine released clear-road launch: it loses targetIndex and launchBearing, changes the aim by **0.16552149034433358 rad**, and replaces released vx/vy/vz **(-169.8329155795106, 7.590364260619756, 105.62566348081714)** with straight **(-150.10814155500805, 0, 132.16484343009552)**. The separate actual flight test launches a genuine switch-off bolt first, then changes only the actual feature view to isolate the in-flight guard; no projectile or resolver output is fabricated. The active route drops targetIndex0 to null and keeps vx/vz **(-169.8329155795106, 105.62566348081714)** while the genuine released consumer homes to **(-169.36658638349456, 106.37179803313605)**. The released target identity remains index0.

Each real pending failure message is:

- **PENDING CLAUDE RANGE: active consumer must not silently replace measured released beyond180 target aim with an unreviewed straight-shot fallback**.
- **PENDING CLAUDE RANGE: active in-flight consumer must not discard measured released beyond180 real-target guidance at the CPU acquisition cap**.

Claude's written range question and audio handoff remain held. These additive failures preserve the measured released behavior for this unambiguous legal witness and prevent whole-card GREEN while the precise active context is unsettled. They do not assert a new universal cap, player reach formula, producer or upgrade rule. No empty TODO replaces either regression.

### Checks and exact preservation

- Before correction/additions, actual CORE/runtime/SAVE: **301 cases, 300 pass, one fail, zero TODO**; exit1. Checks reached core598/runtime771/save602.
- Targeted reviewed decoy/range and new released consumer tests: **17 cases, 15 pass, two pending range RED, zero TODO**; exit1. Checks reached131. No fixture exceptions.
- Final default actual CORE/runtime/SAVE: **308 cases, 306 pass, exactly the two pending range RED, zero skipped/TODO**; exit1. Checks reached **core598/runtime860/save602**. All original 301 cases now pass; all **98 save cases** remain unchanged and pass.
- Protected original CORE selection: **48/48**, exactly **449** checks; exit0.
- Existing feature-flags/Wasteland-beta/Wasteland-easter-egg/combat-projectiles/projectile-order guards: **50/50 TAP cases**, plus all **32 feature-switch checks**; exit0. No guard or flag was changed.
- Unchanged replay suite: **162/162 fingerprints**, 18 cases, 16 events, eight categories, three FPS values, three runs; exit0. No fingerprint was added/regenerated because the ownership grant keeps existing replay files read-only.
- node --check tools/test-arsenal-runtime.mjs and git diff --check: pass.

Reversing only the two new Node imports and the approved setup/context, then removing additive tests, reconstructs the prior runtime file **exactly 47,971 bytes**, SHA-256 **6df9f61733bb052f419d65b4317cd44a414a66b34c6087bed8a6ef63be5fb46e**. All other existing assertions, helpers, fixtures and contexts are byte-exact. **236 tracked Source/protected test/replay/flag/audio/launcher paths** retain their pre-run hashes with zero changes. Source combat-weapons remains SHA-256 **745d08116824f622b8d7c0ef869dc386f9f74de9848db022fae9b7a5ccd8026f**; Source combat-projectiles remains **dccf888a423f4fd2fdc56482699d27dbff6b709358c8701d22bc690a704876b4**. No Source, other lane file, flag, launcher, audio, catalog, public output, live/Preview folder, port5174, player save or replay pin was touched. The existing change-note prefix is retained verbatim.

Full raw before/targeted/final TAP, feature/core/replay logs, exact native witness JSON, source hash manifest and byte-preservation proof stay under ignored **.evidence/2026-10-01/ARS-CORE/native-fixture-range-review/**. No Source/lane/full/build/browser/audio/whole-card/merge claim is made. The Director owns the Claude settlement and subsequent source continuation.

### Removed — reviewed fixture follow-up

Replaced only the misleading 180-metre negative arena fixture context and wrapped coordinates in the reviewer-approved case. No strict expected selection, actor/participant assertion or other original status/road context was removed or weakened. No production rule, old test, source body, real save, asset or fingerprint was removed. The pending active player launch/flight cap is documented for the later Claude-settled Source change; this tests-only task does not replace it.

## Claude-settled Crossbow physical reach acceptance, 1 October 2026

This tests-first follow-up starts from clean `048d55c4419c6621a0b9a39dfcb60df31c4b3f95`
with provisional Source unchanged. Claude's 04:00 decision is in the current
`docs/ARSENAL.md` and board: player launch and in-flight reach use bolt speed at
its upgrade level plus launching-car speed, times remaining lifetime. CPU
acquisition remains 180 m. Only additive runtime tests and this appended note
are owned. Source continuation is not part of this test-author freeze.

### Actual consumers and independent native boundary witnesses

Thirty-five added cases exercise `fireWeapon` and `stepProjectiles` against
measured native world targets. The expected formula uses settled 200 m/s base
speed, 30 m/s per level, 2.5 seconds lifetime and actual `DRIVE.mphToWorld`.
Targets are real actors placed at real legal Course points found by native
`worldAt` distance measurements. No target resolver, projectile, Course return,
launch method or stepping clock is replaced. Measured boundaries use +/- .05 m,
with the existing 1e-7 native measurement precision; no acceptance tolerance or
physical tuning was added. Cases cover:

- L0/L3, zero/40 mph collinear carry, player acquisition just inside/outside.
- Actual .125/.25-second bolts, current projectile origin and remaining lifetime,
  inside/outside reach, original horizontal speed and fixed-step age increments.
- A real target inside range from the bolt but beyond range from the parked car.
- Original launched upgrade/carry after changing the car's current speed to
  zero/120 mph and its current upgrade level to zero.
- Stable locked identity with a nearer hostile real car; native flagged decoys
  just inside/outside player launch and flight boundaries.
- Actual biased CPU bolts in flight and unchanged CPU 180 m launch boundaries.

Flight fixtures first launch using the genuine released/off consumer, then run
normal `stepProjectiles(1/120)` ticks with the original target temporarily out
of play. The same real bolt retains its position, velocity, level and age; none
is reset or fabricated. Actual Arsenal is activated only after aging to isolate
the in-flight reach route. The first draft aimed an 850 m initial shot that hit
native terrain before the intended age. That fixture error is preserved in
`first-physical-red.log`; the initial clear ascending shot was corrected to
230 m without changing any physical boundary assertion. All final fixtures
survive their real aging. Native decoy DATA uses the existing initialized NPC
fixture; future playable decoy creation remains its producer card's work.

### Scalar/vector ambiguity sent to the Director

The released producer adds `velocity(actor, at)` as a vector, including heading,
dir and push velocity. Existing L3/carry40 released road-witness measurement gives
actual horizontal speed 307.65131264062467 m/s, while the literal scalar decision
would give 290 + 40*.44704 = 307.8816 m/s: about .5757 m difference over 2.5 s.
The Director was informed in writing before any Source fix. All new moving-car
boundaries deliberately use collinear forward carry, where both interpretations
agree. These tests do not choose diagonal, negative-speed or push-velocity
policy. Such material interpretation needs Claude's written clarification;
no new cap or redesign is supplied by this task. Original off-path velocities,
ages and lifetime remain covered by unchanged released-consumer controls.

### Executed RED, preservation and reproduction

Targeted command: `node --test --test-name-pattern='PHYSICAL REACH'
tools/test-arsenal-runtime.mjs`. Final actual result: **35 cases, 17 pass,
18 genuine reach/identity failures, zero skips/TODO**, exit1. All failures reach
actual consumer acceptance, not fixture exceptions. CPU 180 m launch and all
outside-range controls pass; current player launch and guidance still discard
reachable targets at the old CPU cap. No fabricated GREEN is claimed.

Complete command: `node --test tools/test-arsenal-core.mjs
tools/test-arsenal-runtime.mjs tools/test-arsenal-save.mjs`. Actual result:
**343 cases, 323 pass, 20 fail, zero skips/TODO**, exit1, 16.90 s. This retains
all original **308 cases: 306 pass and the two existing genuine reach RED**;
new cases add 17 passing controls and 18 RED. CORE and canonical save cases
remain unchanged, including whole-profile unknown and per-player preservation.
No bank/audio file changed; cue dispatch names alone do not establish listening
or sound readiness. AUD-ARSENAL-W1 owns sounds while Arsenal is in development.

The original runtime prefix remains byte-exact: **58,219 bytes**, SHA-256
`c33d70b4bc6e993a713db67f154ab07e940e731f1934d3d0e125d58b5ca37554`.
A Buffer comparison against the original Git blob proves exact preservation,
including UTF-8 and line endings. CORE/save tests and the three Source consumer
files were also directly byte-compared with that freeze. The only changed
tracked path before this note was the assigned runtime test. No original case,
assertion, helper, replay pin, flag, Source, fit, catalog or asset changed.
The original note prefix is retained by append, with its size/hash recorded.
Syntax and `git diff --check` pass. This intentionally RED test freeze is not a
Source/lane/full/build/browser/audio or merge clearance.

Complete raw TAP and byte provenance are retained under integration
`.evidence/2026-10-01/ARS-CORE/physical-reach-tests/`: first fixture failure,
clear-flight RED, final targeted RED, whole CORE/runtime/save RED,
`byte-preservation.json` and the original runtime/note-prefix receipts.
The Director owns the remaining design clarification, Source assignment and
exact gates. No real player storage was read; synthetic test storage only.

### Removed - physical reach acceptance

Removed none. No existing Source, assertion, test, profile field, asset, audio,
flag or replay fingerprint was replaced. The 850 m initial test-only launch
fixture was corrected before freeze; its full failure remains honest evidence.
All old cases remain exact, and review evidence stays ignored until consumed.
No live folder, Preview, `.preview-dist`, port 5174, new dependency, network,
helper agent, merge, push, release or history rewrite was used.

## Independent App retry save acceptance - 1 October 2026

The actual App purchase, upgrade and equip retry overwrites another named
player's newer durable profile after an earlier shop save fails. This is a
pre-existing shared-helper defect exposed by the new Arsenal caller, not a
claim that Oil introduced the helper. The independent Save Guardian report at
integration `.evidence/2026-10-01/ARS-CORE/wiring-save-review/guardian-report.json`
identified this obligation on `bffb2eaf5b0c6fd4b5603f5365733632f808b341`, with
Source `41ed21dfb84bf0b2326ef5cbe32a9ad133447f83` unchanged. The card's settled
save acceptance in `docs/ARSENAL.md` section 2 requires per-player isolation,
unknown fields, future identities and four saved slots to survive.

### Actual App reproduction and passing controls

Eight appended cases use real `App.purchaseArsenalWeapon('oil')`,
`App.purchaseWeapon('oil')` and `App.equipCarWeapon(1, 'oil')`, with actual
registry creation, replacement, normalization, load and save. Both synthetic
named players start with 54,321 ordinary credits. Only `PLAYERS_KEY` writes
throw during the first action; reads remain real memory reads. The real action
reports the proper save error and restores its entire owner profile and full
raw durable registry. Exactly one attempted write fails, with no durable write.
The App retains its genuine `profileSaved === false` retry state.

After write recovery, a distinct storage adapter loads the durable registry
and uses real `replacePlayerProfile`/`savePlayers` to advance only player two:
99,999 credits, `externalProgress: {kept: 'new'}`, unknown career and weapon
progress, one future level of 17, and four distinct earned future slot ids.
The external writer's raw input remains unchanged. A genuine load proves all
of this is saved before the owner retries; no app registry is edited to model
that concurrent writer and no saver or shop return is fabricated.

All three owner-only controls pass after the retry. The real action succeeds,
saves exactly once, retains the active owner, and persists the complete owner
profile. The failed-then-successful purchase costs exactly 400 scrap, upgrade
exactly 150 scrap and one level, and equip costs nothing. Ordinary credits
remain 54,321. Oil ownership appears exactly once; upgrade alone advances to
level one; equip alone changes the requested slot. Unknown owner fields,
future level nine and the other saved slots remain intact. Upgrade and equip
exercise distinct real mutations and rollback/save call branches, rather than
mock copies of the purchase result.

### Five genuine RED and their exact messages

The real retry reverts player two to 54,321 credits, removes its concurrent
unknown progress and future level, and replaces its new four-slot loadout with
the older one. The five failing acceptance messages are:

- `successful purchase retry must preserve the full latest other-player profile after failed save`
- `successful upgrade retry must preserve the full latest other-player profile after failed save`
- `successful equip retry must preserve the full latest other-player profile after failed save`
- `successful purchase retry must retain concurrently saved unknown root/career/weapon progress and future level`
- `successful purchase retry must retain all four concurrent future slots and their earned ownership`

The shared helper currently chooses stale `this.players` when `profileSaved`
is false. Its refresh helper also returns early in that state. These source
observations explain the measured result; acceptance compares real native
results and complete normalized profiles, not strings from source bodies.
No policy for changing the active player or same-owner concurrent writes is
chosen by this test slice.

### Existing absent/unreadable storage guards and scope

Existing `tools/test-warlord-settlement.mjs` cases at lines 384-487 exercise
actual App settlement retry against missing, unreadable and unsupported
registries, including safe initial-registry creation and preservation of
unsaved session fields. They pass unchanged: 29 cases. These are a distinct
settlement helper and do not claim Arsenal shop retry clearance. Existing
progression denied/corrupt-storage controls pass (27 checks), as do real App
session-only race settings (42 checks) and paint (35 checks). No new storage
fallback policy or duplicated guard assertion was added. A future shared-save
fix must keep these controls: `loadPlayers` can return a default registry for
absent or unreadable storage; blindly treating that as fresh durable progress
must not erase an unsaved named-player profile.

### Executed results and protected byte receipts

Before edits, actual native CORE/runtime/SAVE ran **343 cases: 323 pass,
20 existing physical-range failures, zero skips/TODO**, exit 1. The original
range failures remain separate from this save defect.

Focused command: `node --test --test-name-pattern='NATIVE APP RETRY'
tools/test-arsenal-runtime.mjs`. Actual result: **8 cases, 3 pass, 5 genuine
save failures, zero skips/TODO**, exit 1, 245 acceptance checks reached.

Complete command: `node --test tools/test-arsenal-core.mjs
tools/test-arsenal-runtime.mjs tools/test-arsenal-save.mjs`. Actual result:
**351 cases, 326 pass, 25 fail, zero skips/TODO**, exit 1. This is the same
20 original range failures plus the five measured save failures. Runtime
reports 1,558 reached checks; CORE 598 and canonical SAVE 602 are unchanged.
Existing replay fingerprints pass: 162 checks, 18 cases, three frame rates
and three repetitions. Feature switches pass all 32 checks. Syntax and
`git diff --check` pass. No full/lane/build/browser/audio or card clearance
is claimed by this intentionally RED test freeze.

The original runtime prefix is byte-exact: 68,232 bytes, SHA-256
`fb01286476f229e331636c03053f0b32ca565c1fe43cbee964979928b6b3b7d7`.
Its new complete test is 77,259 bytes, SHA-256
`3ecc2c4a896797d79905b300318d82dd4d40a1204af6afdf733a47f476f01dda`.
The original note prefix remains raw-byte exact by append: 126,274 bytes,
SHA-256 `4371bcbacfaae8ea543ee8b2eec2769abcd9d63476257f97e6cba2fe2ee51a82`.
No old assertion, helper, case, fingerprint, Source or profile normalizer was
changed. Protected source and all unowned tracked files are checked against
the original receipts. In particular actual App SHA-256 remains
`b73b90c1c9202e62ce1a7a59f254076f0f73b33e99d5b56b9f91aabc328c9970`
and progression remains
`6360f5aa2b7d05c76ab0599f043551610785a52930df66b5704ed579983918e2`.

Complete original and final native TAP, targeted RED, replay and feature logs,
existing storage-guard logs, original prefix copies and before/after protected
byte receipts are ignored integration evidence under
`.evidence/2026-10-01/ARS-CORE/retry-save-tests/`. The Salt quiet frame window
was honored: only reads occurred until the Director released it. The Director
owns the later Source fix and gates. All storage here is process-local memory.

### Removed - retry save acceptance

Removed none. These are additive tests and an appended note. No Source,
existing assertion, registry helper, profile field, slot, asset, flag, replay,
launcher, audio, recipe or runtime behavior was replaced. No live folder,
Preview, `.preview-dist`, port 5174, real saves, new dependency, network,
helper agent, merge, push, release or history rewrite was used.

## Independent Oil retry safety guards - 1 October 2026

Six additional actual App checks expose unsafe retry writes when a durable
registry is unreadable or another player has a newer Wasteland schema. This
continues the tests-only freeze `c58a27537d230bbc76642f6bd3c6d4f71d0660a9`;
its original 351 cases, assertions and note bytes remain exact. Source is
unchanged. These checks apply the card's existing save preservation obligation
and the already-settled actual App settlement guards to the inherited shop
retry path. They do not introduce an active-player or same-owner concurrency
policy, or a new absent-registry/session-only recovery policy.

### Genuine native fixtures and results

Every case begins with a real failed `App.purchaseArsenalWeapon('oil')`.
Only registry writes fail during that first call. The exact save-error result,
full owner rollback, unchanged durable raw bytes, no committed write and
`profileSaved === false` are proved before the unsafe retry. Storage is then
writable. All data lives in the existing process-local memory fixture.

For `future-other`, a newer-writer DATA fixture updates the OTHER player's
raw durable registry: career version 8, credits 99,999, unknown future progress
and four future slots. This write goes directly to the memory value so that
this older build never fabricates the future writer's normalization. Genuine
`savePlayers` independently refuses that exact future registry, preserves its
complete raw bytes and full input object, and performs no write. Actual
`loadPlayers` also retains the nested career version 8. The subsequent real
App retry nevertheless saves the stale version-one local registry over it,
wrongly succeeds, grants Oil and charges 400 scrap. This proves that the
intended production future-schema refusal is bypassed, rather than alleging
that the production save normalizer itself accepts version 8.

For `unreadable`, only `getItem(PLAYERS_KEY)` throws. The controlled adapter's
read failure is directly proved before retry; `setItem` remains a genuine
working memory write. The actual stale-registry App retry wrongly succeeds,
writes over the durable registry, grants Oil and charges 400 scrap despite
being unable to read the durable save safely. No production loader, saver,
shop result, player registry or profile normalization body is mocked.

Three independent acceptance cases per scenario check the refusal result,
exact durable bytes plus write count, and the full owner profile plus unsaved
status. Separate cases keep each consequence observable even while the first
refusal assertion is RED. Exact failure messages, with `K` replaced by each
of `future-other` and `unreadable`, are:

- `K: actual Oil purchase retry must refuse an unsafe durable registry`
- `K: actual Oil purchase retry must not overwrite unsafe durable raw bytes or issue a registry write`
- `K: actual Oil purchase retry must retain complete unsaved owner profile without scrap charge or unearned Oil`

The existing settlement tests already define distinct missing/unreadable and
legitimate never-saved recovery controls. They passed unchanged in the prior
freeze and remain byte-exact. No absent-registry test duplicates them or
extends their policy to a previously saved shop registry by inference. Their
passing verdict does not clear this newly proven shop-path gap. The Director
owns the Source fix and its safe handling of true absence, unreadable data and
newer schemas.

### Executed guard RED and preservation

Focused command: `node --test --test-name-pattern='NATIVE APP RETRY GUARD'
tools/test-arsenal-runtime.mjs`. Actual result: **6 cases, zero pass, six
genuine guard failures, zero skips/TODO**, exit 1, 72 reached checks.

Complete command: `node --test tools/test-arsenal-core.mjs
tools/test-arsenal-runtime.mjs tools/test-arsenal-save.mjs`. Actual result:
**357 cases, 326 pass, 31 fail, zero skips/TODO**, exit 1. The unchanged
original 351 retain 326 pass and 25 RED: twenty physical-range failures and
five other-player save preservation failures. The additional six RED are only
the invalid/unreadable shop retry guards. No Source/lane/full/build/browser/
audio, merge or whole-feature clearance is claimed.

The original runtime prefix remains byte-exact: 77,259 bytes, SHA-256
`3ecc2c4a896797d79905b300318d82dd4d40a1204af6afdf733a47f476f01dda`.
The complete new runtime is 82,465 bytes, SHA-256
`f5965bb6f02ec3c39aabd04c1806052c62ec7f6a19f4525e7dc9f3ebc0448b67`.
The prior note prefix remains exact by raw append: 133,628 bytes, SHA-256
`48eb667941f025626ce435356bbf72950dc8056d56208f6d4eb2584c6cfb74d4`.
All 1,186 unowned tracked files, including Source, canonical save assertions,
profile normalizers, replay fingerprints and feature guards, retain their
protected bytes. Actual App SHA-256 is still
`b73b90c1c9202e62ce1a7a59f254076f0f73b33e99d5b56b9f91aabc328c9970`.
Syntax and `git diff --check` pass. Prior replay162/feature32 and storage-guard
logs remain in the parent evidence folder; no unchanged policy was re-tested
or represented as new implementation.

Complete targeted and native TAP, original prefix copies, and before/after
protected byte receipts are retained under integration
`.evidence/2026-10-01/ARS-CORE/retry-save-tests/guards/`. No source fix preceded
these failures. This freeze returns tests and note ownership to the Director.

### Removed - Oil retry safety guards

Removed none. Six cases and this note are appended. All earlier assertions,
helpers, cases, saves, fingerprints, assets and Source bytes remain intact.
No live folder, Preview, `.preview-dist`, port 5174, real save, protected audio,
new dependency, network, helper agent, merge, push, release or history rewrite
was used.


## Narrow App retry-save Source fix — 1 October 2026

The actual purchase/upgrade/equip retry loss and unsafe durable-write cases are
fixed in the existing App save hook. Only src/app.js and this appended verdict
changed. This is a bounded Source handoff for independent Save Guardian review,
not a lane merge, full-tier pass or finished ARS-CORE card.

### Tests first and approved scope

Started clean at c58a27537d230bbc76642f6bd3c6d4f71d0660a9. Reproduced the
unchanged eight actual App cases: **3 pass, five RED**. The Director then held
source edits because an invalid-to-local write fallback could destroy a genuine
future version-eight other-player career or an unreadable durable registry.
Independent additive guard freeze bafc5d6c8baee94928e72b38596eee3ef9e8b549
was clean before this fix. Reproduced its full targeted acceptance unchanged:
**14 cases, three pass, 11 RED, 317 reached checks**, zero skips/TODOs.

The Director approved exactly the refined bounded approach before source edits:
valid durable retry merges only OTHER player IDs; invalid durable retry skips
only the durable write; absence keeps prior local/session behavior. Existing
local owner replacement, activePlayer selection, discovery sync and unsaved
status remain, so session-only paint/setup survives unavailable storage.
The normal non-retry loadPlayers path, raw registry validator, refresh helper,
same-owner concurrency policy and active-player policy were not changed.

### What changed

_saveProfile now uses the existing validated raw readWarlordRegistry reader
only during a retry after profileSaved===false. It does not treat loadPlayers'
synthesized defaults as durable evidence. Ready data contributes complete latest
OTHER-player entries to the existing local map. The acting owner's current
profile is still applied through the existing replacement/save flow.

An invalid or unreadable durable retry returns the existing failed-save status
without calling savePlayers or issuing a registry write. Existing in-memory
owner replacement and discovery sync still run. The shop's existing rollback
therefore preserves the whole owner profile with no charge or unearned weapon.
Future-version-eight and unreadable durable raw bytes remain exact. A proved
absent registry retains the earlier local/session path; no helper was refactored.

### Executed results

| Check | Result |
| --- | --- |
| Exact targeted retry command | 14/14 pass; 317 checks; zero skips/TODOs. Before: 3/14 pass, 11 genuine RED. |
| Frozen complete native command | 357 cases: 337 pass, 20 existing range RED, zero skips/TODOs; exit 1. Before: 326 pass, 31 RED. |
| CORE and canonical SAVE | CORE 72/72, 598 checks; SAVE 98/98, 602 checks, unchanged. |
| Complete native runtime | 187 cases: 167 pass, 20 held physical-range failures; 1,630 reached checks. |
| Existing settlement read/missing/future guards | 29/29 pass unchanged. |
| Existing progression, per-player race settings and paint | 27, 42 and 35 checks pass unchanged, including unsaved session behavior. |
| Relevant native source/save regressions | All 34 unchanged scripts exit zero. |
| Road and combat replay pins | 162/162 and 12/12 unchanged. |
| Feature flag controls | All 32 pass unchanged. |
| npm run build | Pass in the isolated lane; normal dist only. Existing advisory chunk warning remains. |
| Syntax, git diff --check, source LF | Pass. |

Targeted command: node --test --test-name-pattern='NATIVE APP RETRY' tools/test-arsenal-runtime.mjs.

Complete command: node --test tools/test-arsenal-core.mjs tools/test-arsenal-runtime.mjs tools/test-arsenal-save.mjs.

The 34 regressions cover actual Warlord settlement, progression/race settings/
paint, upgrades/loadouts, damaged/historical/Wasteland profiles, named-player
integration, career backup and save budgets; combat/armor/projectile ordering/
CPU/pickups/shields/on-foot/scoring/opponents, road/combat pins, standing Fuel
carrier/attribution, Fuel Run/depot, steering, flags/beta and repository placement.
Every remaining native failure is in the unchanged PENDING CLAUDE RANGE or
PHYSICAL REACH groups. No range source, assertion or tuning was changed here.

Full logs and raw-byte receipts are private integration evidence under
.evidence/2026-10-01/ARS-CORE/retry-save-source/. The source tests used process-local
memory storage. No real save, live folder, Preview, .preview-dist, port 5174,
browser/frame measurement, new dependency, network, audio, asset, merge, push,
release, forced operation or history rewrite was used.

### Exact protected bytes and remaining gates

All **1,186 unowned tracked files** match the clean bafc guard freeze exactly.
All test assertions, pure save/Arsenal modules, physical-range source, audio,
launcher, flags, pins and metadata are protected. Earlier note bytes remain an
exact appended prefix; no previous verdict was rewritten.

| Receipt | Bytes / SHA-256 |
| --- | --- |
| Original App | 78707 / b73b90c1c9202e62ce1a7a59f254076f0f73b33e99d5b56b9f91aabc328c9970 |
| Fixed App | 79117 / dfbe3e0542c156b02d9f975463aec1f2c0389de0e8a38039bae72d587782517f |
| Unchanged note prefix | 139343 / a73be59d4ae2815f870276b1b5c0bdccc3711d7716e22813b2c6fa0e734840b7 |
| Unchanged runtime tests | f5965bb6f02ec3c39aabd04c1806052c62ec7f6a19f4525e7dc9f3ebc0448b67 |
| Unchanged CORE tests | ca1f275216c643b802ceada5d86967751608356ee7aea1bda4ffeeeed43c541f |
| Unchanged SAVE tests | 54480590357b34f190dc2ce8f713ccb420ece5a959480ade437254ecb5f6b945 |


Independent Save Guardian/source review follows this clean freeze. Claude's
physical-range settlement and source continuation, wiring/browser/balance/
audio acceptance and exact lane/build merge gates remain. The full native suite
is still RED for the 20 known range cases; no feature merge or whole-card
clearance is claimed.

### Removed — narrow retry-save Source fix

Removed stale OTHER-player selection during actual retry and the unsafe attempt
to write a stale local registry when recovered durable data is invalid or
unreadable. The existing reader, validator, normal save path, same-owner policy,
session-only memory behavior, transaction rollback and one-charge rules remain.
No test, fixture, profile field, future schema, earned identity, slot, pin,
runtime asset, licensed source or other lane work was removed.
