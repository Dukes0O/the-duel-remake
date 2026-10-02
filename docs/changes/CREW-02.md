# CREW-02: signature gear simulation built; shared wiring held

Status: building. Native App acceptance is still incomplete. Production logic
is implemented in the owned src/crew-gear/ modules. Tests were committed first
at b85ce3 and remain unchanged; none of the held hooks or boss files was edited.

## Production Source

gear.js defines the settled catalog, discovery/switch admission and Rook's
0.6 s lock / 1.8 s reload override. signature.js owns inventory, selection,
refill, Cinder's cone/fuel, Odessa's turret and Jax's grapple product.
contacts.js reuses native vehicle dimensions, continuous sweeps, armor/team/
shield protection, fighter/raider damage and the released crash solver.
projectiles.js owns actual gear shot records in combat.projectiles:

- Nell: upward arc, first-contact attachment, zero velocity while stuck,
  three-second contact fuse, beeps, 25 armor / 60 health and her 6 m radius.
- Wren: bounded arc into the shared arsenal smoke list, 2.5 m radius, 6 s.
- Dune: actual 90 m/s bolt, 150 m flight limit, 15 armor and native knockdown.
- Tusk: shell contact, 20 armor and native 1,450 kg / 35 mph solver response.

Odessa's real deployable has 60 health, nearest hostile target, 35 m reach,
0.8 s cadence, 4 armor / 10 health, 20 s life and 30 s retirement recharge.
Its own turretReadyAt survives refill/re-entry and does not block the RPG.
Cinder uses the native contact path for the 6 m / 35 degree cone: 10 armor/s,
30 health/s, four seconds of fuel, half-second-per-second idle refill and
fire immunity admission. Tusk's walking contact starts existing free-body
motion at 1 m/s. Stock refills and RPG refill are ready for the car-entry hook.
Jax's ray rejects cars at 90 km/h or above and targets within 25 m; the pull
produces real roof arrival or an actual salvage-ledge top. CREW-03 consumes
the roof attachment for shake-off, charge and safe landing; none is invented
here. Marksman aiming supplies a read-only 3x magnification field.

## Tests and limits

The original native --admission-only run still reports 6 checks, 2 controls
passed and 4 genuine failures: missing switch, App slot 3 stays on RPG,
Nell selectFootGear(3) returns false and Rook's 0.6 s shot remains unlocked.
The two controls preserve released RPG/wrench and undiscovered save refusal.
No future module/export is imported by this independent acceptance suite.

A bounded scratch check uses actual Duel campaign/exit entrypoints, then the
owned production module entrypoints. Its feature-flags adapter admits the
unregistered crew switch only to exercise these unintegrated modules. It
proves code behavior, not native App admission or a finished feature:
Nell/Dune/Tusk remove exactly 25/15/20 armor; Tusk creates native knock motion;
Wren creates and retires the shared 2.5 m / 6 s smoke; Odessa deals 4 armor at
0.8 s, has 60 health and is destructible; Cinder deals 10 armor/s and spends
one fuel second; refill restores fuel; Jax reaches a real enemy roof.
The check took 2.08 s. node --check for all four modules and git diff --check
pass. No broad tests, builds or captures run while Root owns the heavy slot.

Independent RED tests d724db6 reproduced own-car blast armor 25 instead of
the native 6.25 cap, plus deployment and retirement blocking a ready RPG.
The first fixes passed seven bounded module tests: native self:true applies the
existing armor cap; fighter self-splash stays unchanged; turret recharge starts
on actual expiry/destruction and preserves RPG readiness through refill.
The original native turret timestamp assertion is retained for a compatible
selected-gear timer view in later shared wiring. Independent terrain RED tests
9446a0f reproduced Dune 0.294 m and Tusk 0.135 m below native ground. Direct
shots now retire at their first sampled/bisected native terrain crossing; an
earlier actual body/scenery hit still wins. Tests-first 3ecefcd then reproduced
missing 4.5 m/s walking inheritance for Dune and Nell. Launch now adds observed
native fixed-step movement after contacts; stationary controls stay 90/18 m/s.
Refill clears launch history, preserving turret recharge. All eleven bounded
checks pass. Range, clock, damage and grenade handling remain unchanged.

All existing assertions, race fingerprints and world signatures are unchanged.
The complete independent mechanics, real camera controls and memory-only
named-player tests still await native wiring and their permitted test slot.
Turret contact tests must use actual native incoming projectile products after
wiring. Browser per-item, both camera modes, visual/audio and lane/build gates
remain outstanding. No native App or gameplay acceptance is claimed green.

## Exact shared hooks requested from the Director

- Card hooks: feature-flags.js and crew.js for admission/activation;
  onfoot-weapons.js for initialize/select/fire dispatch and Rook timing;
  onfoot-transition.js for refill and fixed-time grapple after movement;
  combat-hud.js for actual inventory; sound-bank.js/audio.js for named cues.
- Additional narrow hooks: combat-projectiles.js dispatches crewGearShot
  records through stepGearProjectile and native incoming turret contact;
  combat.js ticks deployables after car re-entry and shared hazards when
  crew gear is active; combat-scene.js draws the actual shots/deployables/
  flamer/grapple; onfoot-camera.js and render3d.js apply 3x Marksman fov.
- Owned constants require no wasteland-tuning.js edit. No shared file is
  granted to this builder yet. Root must audit owners and grant exact hooks.

Named cues are crew.sticky.arm/beep/explode, crew.grapple.launch,
crew.turret.deploy/fire/retire, crew.flamer.start/stop, crew.marksman.fire,
crew.scrap-cannon.fire and weapon.smoke.deploy. Audio installation is held.

## Removed

Removed shared turret/RPG recharge and underground direct-shot travel. RPG, wrench,
saves, assets and shared code are retained.
No stub or placeholder is presented as a finished gear item.
