# The arsenal: new car weapons, settled for build

Claude, 30 September 2026, at Kyle's request to design the rest of phase 3.
SPEC 3.3 lists the weapons; this document settles them for build: numbers,
counters, computer use, sounds, unlocks and the shared systems underneath.
Build on it; do not redesign it. If a number proves wrong in play or in the
balance check, record the evidence and the change in `docs/board/decisions.md`.

## 1. What makes a good weapon here

The game is played by Kyle and his 11-year-old son, so every weapon follows
four rules:

1. **Readable.** You can see what hit you and why. Anything placed on the
   road (oil, caltrops, smoke, a mortar marker) is drawn clearly before it
   matters.
2. **Counterable.** Every weapon has a counter a child can learn in one
   race: steer around, brake, shield, break the line.
3. **Never a lock-out.** No effect takes control away for more than about a
   second. Spins recover, slow-downs end, a disabled car still drives.
4. **Arcade sound.** Kyle's rule for car weapons stands: a bright transient
   above the engine band, a tonal signature, a flight sound that travels with
   a projectile, a hit confirm, all judged over the engine at full throttle.

## 2. The shared systems (build once, in ARS-CORE)

Twelve weapons sit on five small systems. Each weapon card only adds its own
numbers, look and sound.

| System | File | What it does |
| --- | --- | --- |
| Road hazards | `src/arsenal/hazards.js` | A bounded list (at most 24) of shapes on the course: circle or strip, owner, kind, age, lifetime. Each fixed step, a car whose body overlaps a hazard gets its effect **once per hazard**. Used by Oil Slick, Caltrops, Smoke Screen, the Dustmonger and Wren's smoke grenades. |
| Car effects | `src/arsenal/car-effects.js` | Timed states on any car (player, rival, CPU, arena car): `slick`, `grip`, `tether`, `disabled`, `burning`, `nitro`. Each has a duration and is stepped in the fixed step. The driving and CPU code read them through one function, never by poking at fields. |
| Targeting | `src/arsenal/targeting.js` | One function, `targetFor(duel, attacker)`, used by every aimed CPU shot, every homing projectile and every lock-on (including the RPG). It applies smoke (no target through or inside a cloud) and decoys (a decoy draws the aim while it lives). Existing CPU aim and homing code must route through it. Settled 1 October 2026: a weapon's range for targeting is its settled range; the crossbow's, for a player launch or a bolt in flight, is the bolt's physical reach (the magnitude of its actual horizontal launch velocity, its level speed plus the launching car's full velocity vector, fixed at launch, times remaining lifetime), and CPU crossbow acquisition stays 180 m. It takes an optional third argument, the attack context `{range, origin, lockedTargetId}`: `range` is that weapon's settled range (no shared default), `origin` is where the shot is now (the projectile for a shot in flight, the attacker's current position for a new shot). A shot or lock that already has a target changes only to a decoy within range or is broken by smoke; it never switches to a different real car. |
| Projectiles | existing `src/combat-projectiles.js` | New kinds: `rocket`, `harpoon`, `mortar`. They start with the thrower's velocity and sweep between steps, as today. |
| Unlocks and loadout | existing `src/weapon-upgrades.js`, `src/car-loadout.js`, armory | A weapon is offered when it is implemented, the `arsenal` switch is on and the player's rank reaches its unlock rank. Buying costs 400 scrap (existing new-weapon price). Warlord rewards unlock their weapon free, whatever the rank. Upgrades use the existing three levels (150, 300, 600 scrap), each 15% stronger or faster (settled 1 October 2026: a weapon that deals damage gets 15% more damage per level; every weapon also recharges 15% faster per level, recharge time divided by 1.15 per level; effects that take control from the victim, such as slick, tether, disable, spin kicks and smoke lifetime, never scale, so upgrades cannot break "never a lock-out". Oil Slick and Smoke Screen therefore upgrade by recharge only). |

**Save rules (Save Guardian on ARS-CORE).** `WEAPON_IDS` stays the four
starters. Purchased and rewarded weapons are added to
`profile.wasteland.weapons.unlocked`; normalizing a save must never grant a
weapon the player has not earned. Unknown fields, future ids, per-player
isolation and the four-slot loadout are preserved.

**Computer loadouts.** CPU cars carry four weapons from those unlocked at the
player's current rank, so opponents grow with the player. Easy uses only the
four starters and wave 1; Medium adds wave 2; Hard may use everything
unlocked. Each weapon below says when the computer fires it. Settled 1 October
2026: every computer loadout carries at least one weapon that damages a car in
front of it, and at most two defensive or control weapons (UFO Jump, Star
Shield, Oil Slick, Smoke Screen, and later ones of that kind).

**Switch.** Everything here is behind a new `arsenal` switch (dev) in
`src/feature-flags.js`, and applies only to a player who has found the gate
(SPEC 0.12). The warlord rewards that deliver a weapon early work in warlord
fights behind `scrapdome` and join the arsenal when it is released.

## 3. The weapons

Numbers are at level 0. "Once per hazard" means a car is affected the first
time its body touches that hazard, not every step.

### Wave 1 (ARS-CORE and ARS-01)

**Oil Slick** · rank 2 · recharge 10 s · rear
- Drops a pool 4 m behind the car: radius 3.5 m, lasts 6 s, fades in the last
  second. Harmless to its owner for the first second.
- A car that touches it (once per hazard): its tyres lose grip for 0.7 s
  (`slick`, grip 0.35) and it gets a spin kick of 2.2 rad/s, turning away from
  the pool's centre. Speed times 0.85. No armor damage. A star shield ignores
  it.
- Counter: steer around the black sheen. Computer: Medium and Hard steer
  around a pool they can see within 60 m; Easy does not. Fires when an enemy
  is within 30 m behind in its lane.
- Sounds: `weapon.oil.deploy`, `weapon.oil.slip`.

**Harpoon** · rank 3 · recharge 12 s · front
- A leading shot at 70 m/s with a 4 degree homing cone, range 50 m.
- On a hit: 6 armor, and the target is tethered for 3 s: its top speed is
  times 0.8, and at the hit it is yanked 6 m/s sideways toward the shooter's
  side. The line is drawn between the cars.
- The tether breaks early if the target steers hard away from the shooter for
  0.5 s in total, raises a star shield, either car wrecks, or they get more
  than 60 m apart.
- Counter: shield, or steer hard the other way. Computer: fires at an enemy
  15 to 50 m ahead within 5 degrees.
- Sounds: `weapon.harpoon.fire`, `.flight`, `.hit`, `.break`.

**Caltrops** · rank 5 · recharge 9 s · rear
- Scatters a strip 3 m behind: 8 m long, 5 m wide, lasts 8 s, drawn as
  glinting spikes.
- A car that touches it (once per hazard): 4 armor, and for 4 s its grip is
  times 0.75 and its top speed times 0.9. A second strip refreshes the time,
  it never stacks.
- Counter: steer around. Computer: drops them when an enemy is within 40 m
  behind.
- Sounds: `weapon.caltrops.deploy`, `weapon.caltrops.hit`.

**Smoke Screen** · rank 6 (the Dustmonger's reward delivers it early) ·
recharge 14 s · rear
- Leaves a cloud 4 m behind: radius 6 m, lasts 5 s, drifts back at 30% of the
  car's speed for its first second, then stays.
- While a cloud stands between an attacker and its target, or either is inside
  it, `targetFor` gives no target: computer cars cannot fire aimed weapons or
  lock on, homing turns off, and an RPG lock breaks. The player can still fire
  straight through it, without homing.
- Counter: go around it. Computer: drops smoke when an enemy is within 50 m
  behind and it has been hit in the last 5 s.
- Sound: `weapon.smoke.deploy`.

### Wave 2 (ARS-02)

**Rocket Pods** · rank 7 (Gearhead Gunn's reward delivers them early) ·
recharge 8 s · front
- Four unguided rockets, 0.12 s apart, spread 3 degrees, 80 m/s, range 120 m,
  10 armor each with a 2 m blast.
- Counter: shield, or weave. Computer: fires at an enemy 20 to 100 m ahead
  within 3 degrees.
- Sounds: `weapon.rockets.fire`, `.flight`, `.hit`.

**Flamethrower** · rank 9 · recharge 11 s · front
- A 3 s burst: a cone 9 m long and 30 degrees wide. 8 armor per second to any
  car inside; a car that leaves it keeps burning for 1.5 s at 4 armor per
  second (`burning`). A star shield blocks it.
- Counter: keep your distance. Computer: fires when an enemy is within 9 m
  in front.
- Sounds: `weapon.flame.start`, `.loop`, `.end`.

**Scrap Magnet** · rank 13 · recharge 15 s · around
- For 6 s, pickup crates and arena salvage within 40 m slide toward the car
  at 12 m/s and are collected on reaching it.
- Counter: a Tesla Coil ends it. Computer: uses it when two or more crates
  are within 40 m.
- Sound: `weapon.magnet.hum`.

**Side Saws** are not a timed weapon any more: they are Sawtooth Sal's reward,
an armory kit that makes side contacts deal 1.6 times ram damage (settled in
`docs/SCRAPDOME.md` section 5, built by WAR-02a-REWARD). Wave 2 therefore has
three weapons.

### Wave 3 (ARS-03)

**Mortar** · rank 14 · recharge 14 s · lobbed
- Aims at the nearest enemy ahead: a red ring 6 m across appears on the road
  where that car will be in 1.6 s, and the shell lands there 1.6 s later.
  25 armor at the centre, less toward the edge, and a small hop.
- Counter: change lanes when you see the ring. Computer: fires at the leader
  when it is 40 to 200 m ahead.
- Sounds: `weapon.mortar.fire`, `.whistle`, `.hit`.

**Tesla Coil** · rank 17 · recharge 18 s · around
- Crackles for 0.4 s (the tell), then pulses 15 m around the car. Cars inside
  have weapons and boost disabled for 3 s (`disabled`; they still drive). A
  car with a star shield loses its shield instead. It also ends a Scrap
  Magnet and destroys a decoy.
- Counter: keep your distance. Computer: fires when an enemy is within 12 m.
- Sounds: `weapon.tesla.charge`, `.pulse`.

**Decoy Drone** · rank 19 (Mother Mirage's reward delivers it early) ·
recharge 16 s · around
- A see-through copy of your car drives your line 10 m to one side for 5 s.
  While it lives, `targetFor` sends computer aim, homing shots and lock-ons
  to it whenever it is within the attacker's range. It bursts into scrap on
  its first hit. Built on the decoy cars from WAR-02c.
- Counter: a Tesla Coil, or shooting it first. Computer: uses it after two
  hits in 6 s.
- Sounds: `weapon.decoy.deploy`, `.burst`.

**Nitro Ram** · rank 21 · recharge 20 s · front
- For 3 s: 35% more top speed and acceleration, spikes out, and ram damage
  times 3 (on the crash-physics change-in-velocity damage). Oil ends it early.
- Counter: dodge, or oil. Computer: Hard only, when an enemy is within 40 m
  ahead in its lane.
- Sounds: `weapon.nitro.start`, `.loop`.

## 4. Tests every weapon card must pass

- Each counter works in a headless test (for example: steering around oil
  means no slip; a shield blocks the harpoon; smoke stops a real CPU shot).
- Hazards: once per hazard, the limit of 24, cleanup at stage end, owner
  grace, deterministic from seed and inputs at 30, 60 and 144 frames a second.
- Targeting: every existing CPU aim, homing and lock path goes through
  `targetFor` (a test fails if a new path bypasses it).
- Save: buying, upgrading, rewarding and equipping are per named player,
  never granted by normalization, and survive old and future saves
  (Save Guardian).
- Balance: the thirty-race combat balance check passes with `wasteland2` and
  `arsenal` on, and the computer really uses each weapon (counted in the
  report).
- Presentation: a private memory-only browser scenario shows each weapon
  firing and its counter, with no console errors, in High and Performance.

## 5. Cards

| Card | Scope | Needs |
| --- | --- | --- |
| ARS-CORE | The five shared systems, the `arsenal` switch, unlock and purchase with Save Guardian, CPU loadouts, and the first two users: Oil Slick and Smoke Screen | WAR-02a-REWARD (both edit the armory) |
| ARS-01 | Harpoon and Caltrops, and computer use of all of wave 1 | ARS-CORE |
| ARS-02 | Rocket Pods, Flamethrower, Scrap Magnet | ARS-01 |
| ARS-03 | Mortar, Tesla Coil, Decoy Drone, Nitro Ram | ARS-02, WAR-02c (the decoy cars) |

Sounds come from Freesound CC0 through `tools/audio/freesound.mjs` and the
catalog, as for the crash sounds. Effects reuse the existing fire, smoke,
explosion and spark sheets; hazards are drawn in code (decals and instanced
sprites). No new heavy art is needed.
