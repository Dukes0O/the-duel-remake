# CREW-04: Computer crews

status: partial-source

## Settled Rules

Claude answered on 4 October; the answer is recorded in CREW.md section 3.
Repair uses the wrench only, with Odessa's two-second perk. An ambush uses
reachable signature gear once and then RPG attacks, at most three attacks
total. Dune uses bolts throughout; Jax and Wren use RPG only; Rook keeps his
handling perk. These rules are implemented in the owned module.

## Source

Each computer gets its own seeded crew stream. The stop controller checks
difficulty, armor, enemies, finish distance, ambush zones and per-lap limits.
It pulls toward the shoulder, parks, creates the native fighter, repairs or
attacks, and resumes driving. Knockdown damage uses the native fighter health
path; the car stays parked until a three-second respawn beside it.

The caller must opt in with `stepCpuCrew(..., {enabled: true})`. The default
is disabled. Admission also requires discovered Wasteland racing and excludes
arena events. The released crew-gear switch has no source change.

CPU gear creates actual records for the existing gear projectile processor.
Turrets and flamers use native sight, contacts and armor damage. Dune uses
the eight-bolt gear's 1.5-second reload; Rook uses the 0.6-second lock and
1.8-second reload. The three-attack ambush cap remains separate from capacity.
Repair events reuse footRepairStarted/Interrupted/Completed cues; attacks use
the existing RPG and crew gear cues. CPU action events now carry their actual
actor and enemy attribution, including turret and flamer lifecycle cues.
Exit, return and respawn playback still need the native audio owner.
No new sound file is added.

## Checks

Independent acceptance test 11efc6e is unchanged: 19 cases, 13 pass, 6 fail.
The six positive native cases remain red because sim-rival has no caller yet.
Existing raiders: 7/7 pass. Owned gear module checks: 16/16 pass.
Combat replay fingerprints: 12/12 pass across four encounters, unchanged.

Independent CPU cue regression 0c02e806 first reproduced three attribution
failures: turret deploy/fire and flamer start consumed the player's Rook line.
After the owned producer fix: 23 cases / 64 executed checks, 17 pass / 6 fail.
The original six native caller failures remain held; all assertions are exact.
Native Odessa and Cinder actions enter the real EngineAudio/Voice consumer.
Each now retains its actual CPU actor and enemy marker, creates no immediate
or queued player caption, and leaves the next native player Crossbow action
able to announce Rook once with the exact kept caption. The actual player
positive control also passes. No Voice or other shared source was edited.

Controller preparation on 8932f6b7 adds only an explicit cpu-crews fixture
request under the board grant; all old assertions remain exact. Four new
native cases give one pass and three reds: missing dev admission, a real
repair stop driven away by sim-rival, and native combat AI firing Crossbow
while that actual crew is outside. Default/off driving and ready-car fire
controls pass. Whole focused suite: 27 cases, 78 checks, 18 pass and nine red;
the six original caller failures remain. No fake crew records or source edits.

Rocket fighter tests: nine native cases/78 checks, two pass/seven red.
Car damage/once-only and participant protection pass. Earlier player bodies,
60-health falloff/half-radius, shield/wreck independence, real raiders and the
real repair-module CPU fighter are missed. No fake shots; old tests are exact.

Direct controller probes pass Odessa's 40-armor/two-second repair and the
three-second knockdown/respawn through damageRaider. Eight seeded crew probes
use real stepProjectiles and finish with three attacks; Dune fires only bolts,
Jax/Wren only RPG, Nell/Tusk use one signature shot, Odessa deploys one turret
and Cinder uses one flamer burst. These are focused source checks, not native
race acceptance or independent review.

The private laptop browser scenario is written but not run. It uses memory-only
saves and requires actual native exits, attacks, visible fighters and a finish.
Natural full Hard race, thirty-race balance, independent switch tests, lane
gate, build, browser, audio and source review remain unmeasured. Not merge-ready.

## Pending Hooks

- sim-rival.js: call the controller behind cpu-crews, retaining native car
  contacts, bounds and lap handling for stopped cars.
- combat-ai.js: suppress a stopped car's own weapon fire.
- combat-projectiles.js: enemy-owned RPG guidance and CPU fighter bodies.
- feature-flags.js: cpu-crews dev switch; independent off/on tests first.
- crew-gear/contacts.js and signature.js: CPU fighter/turret targeting.
- onfoot-race.js: native vehicle sweeps against the stopped crew fighter.
- combat-scene.js and render3d.js: CPU fighters and deployables, without
  changing race state. audio.js: native exit/return playback and repair placement.
- tools/combat-balance.mjs: switch-on thirty-race check.

Arsenal owns its shared hooks until reviewed merge. No pending shared file
was edited. Current integration release docs arrived through a whole-branch
merge and were preserved as received.

## Removed

The obsolete unanswered rule question and source-not-started note were
replaced by the settled answer and current evidence. No runtime path is
replaced or removed. Unattributed CPU action cues were replaced in place.
