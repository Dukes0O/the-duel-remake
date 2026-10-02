# CREW-02: signature simulation and four native hooks built

Status: building. Full native App acceptance remains incomplete. Tests-first
b85ce3 and the independent module regressions are retained. The Director's
3101c87 grant releases crew.js, onfoot-weapons.js, onfoot-transition.js and
onfoot-camera.js. The dae2139 grant adds crew-ui.js and screen-armory.js.
No other owner's shared file or boss file was edited.

## Production Source

The four src/crew-gear modules implement settled inventory, projectile flight,
contacts, damage, grapple, deployable and passive mechanics from CREW.md:

- Nell: upward arc, first car/ground attachment, three-second contact fuse,
  beeps, 25 armor / 60 health and her 6 m radius. Native own-car armor cap.
- Wren: bounded arc into the shared arsenal smoke, 2.5 m radius and 6 s life.
- Dune: actual 90 m/s bolt, 150 m flight limit, 15 armor and native knockdown.
- Tusk: shell hit, 20 armor and native 1,450 kg / 35 mph solver response;
  actual walking contact pushes a parked car through native free-body motion.
- Odessa: real turret, 60 health, nearest hostile, 35 m reach, 0.8 s cadence,
  4 armor / 10 health, 20 s life and 30 s recharge after expiry/destruction.
- Cinder: native 6 m / 35 degree cone, 10 armor/s and 30 health/s, four fuel
  seconds, half-second-per-second refill and fire-immunity admission.
- Jax: 25 m ray, under-90-km/h enemy rejection, actual roof/ledge arrival.
  CREW-03 still owns attachment shake-off, charge and safe landing.

Contacts reuse native dimensions, swept collision, shield/team protection,
armor/wreck/scoring, fighter/raider damage and the released crash solver.
Direct shots retire at native terrain contact before a later target; an
actual earlier body/scenery hit wins. Launch adds observed native movement
after contacts; stationary Dune/Nell controls remain 90/18 m/s.

The granted native hooks initialize and select slot 3, dispatch fire, update
launch history every fixed foot step (including RPG/wrench), seed history
from the actual new exit pose, follow the grapple and refill on real re-entry.
Respawn/re-entry clear obsolete launch history, preserving turret recharge.
Rook's actual RPG uses 0.6 s lock and 1.8 s reload only after dev/discovery
admission. Canonical signature/RPG timers are separate; ordinary selected-gear
timestamp assignments preserve existing assertions and restore RPG readiness.
No hidden accessors or repeated-call history workaround is added.

Jax, Cinder and Tusk are active catalog entries. Earned Tusk in the existing
version-1 crew.unlocked list bypasses his rank gate without paying again.
Unearned Tusk stays rank-gated; future-schema refusal and all profile fields
are preserved. Marksman aim supplies read-only 3x fov in both camera modes;
changing back to RPG/wrench restores the normal view. Enabled crew panels show
KEY 3 / D-PAD DOWN and ready abilities; default/off panels retain the released
inactive copy. Earned Tusk is selectable in the panel without rank or repayment.
Armory accepts an optional actual-flag provider, gated again by saved career
version/discovery; it defaults off while its router provider is owner-held.

## Validation and current failures

Independent tests reproduced and fixed the native own-car blast cap, turret
blocking RPG, underground direct shots and missing 4.5 m/s walking inheritance.
All eleven module checks passed before hooks. Tests-first b21e080 then proved
earned-Tusk admission RED with unearned/future-schema controls before crew.js.
Test author 5f5361d migrated walking fire into the actual next native step,
preserving every velocity assertion, and authored three genuine panel REDs:
enabled gear labeled later, off-context Jax ready, earned Tusk button disabled.
The panel fixes pass all 16 bounded module/native/UI/profile checks.

Unmodified production --admission-only remains 6 checks, 2 controls PASS and
4 held failures: catalog undefined, App/Nell slot 3 refused, Rook unlocked.
These use the unregistered production switch; no App acceptance is claimed.
Bounded actual-Duel probes with an explicit temporary catalog admission prove
Rook's real locked 0.6 s shot / 1.8 s reload and pure 3x camera poses. Released
weapons/transition regressions pass 13/13; camera-choice controls pass 8/8.
Original crew tests pass 4/4, including unchanged inactive-copy, rank, roster
and model-color assertions. The off-state panel is preserved.
Syntax and whitespace pass. No race/world fingerprint was regenerated.

## Remaining owner hooks and gates

- feature-flags.js catalog stays with Bounty; no production crew switch yet.
- combat-projectiles.js dispatches actual crewGearShot products and incoming
  turret hits; combat.js ticks deployables after entry and shared hazards.
- combat-scene.js/render3d.js must draw actual shots, turret, flamer and line,
  and apply camera fov; combat-hud.js must expose actual signature inventory.
- sound-bank.js/audio.js install named cues; tuning needs no constants edit.
- Bounty owns screen-router.js: createArmoryScreen needs the actual callback
  crewGearEnabled:()=>app._switches().enabled('crew-gear')===true; the direct
  yard crewPanel call needs the same context. Both providers remain unedited.
- Save Guardian review is required for earned-Tusk selection.
- Native complete per-item tests, browser per item, both camera modes, visual/
  audio review, lane tier and build remain pending. Heavy slot is with Pit.

Cues: crew.sticky.arm/beep/explode, crew.grapple.launch,
crew.turret.deploy/fire/retire, crew.flamer.start/stop, crew.marksman.fire,
crew.scrap-cannon.fire and weapon.smoke.deploy. Audio installation is held.

## Removed

Removed shared turret/RPG recharge, underground direct-shot travel and inactive
Jax/Cinder/Tusk catalog markers. Current assets, saves and released behavior
are retained. No stub is presented as a finished gear item.
