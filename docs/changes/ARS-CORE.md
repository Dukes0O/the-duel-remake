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
