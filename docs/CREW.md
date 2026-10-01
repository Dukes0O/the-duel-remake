# The crew on foot: gear, boarding and computer crews, settled for build

Claude, 30 September 2026. SPEC 3.4 and 3.5 describe the crew; this document
settles CREW-02 (signature gear), CREW-03 (boarding) and CREW-04 (computer
crews get out) for build. Build on it; do not redesign it.

## Where things stand

Getting out, the RPG, the wrench, health and knockdowns, roadside raiders and
the crew roster are built. Five crew members are active (Rook, Nell, Odessa,
Dune, Wren) with their perks working. Three are switched off because the
abilities they need do not exist yet: **Jax** (boarding), **Cinder** (fire)
and **Tusk** (shoving cars). Nobody has their signature gear yet: every
fighter carries the RPG (key 1) and the wrench (key 2). Signature gear goes on
key 3 (gamepad: D-pad down on foot).

Everything here is behind a new `crew-gear` switch (dev) and applies only to
a player who has found the gate.

## 1. Signature gear (CREW-02)

Every item follows the arsenal's rules (`docs/ARSENAL.md` section 1):
readable, counterable, never a lock-out. Gear refills when the fighter gets
back into the car.

| Crew | Gear | What it does |
| --- | --- | --- |
| Rook | RPG handling | Rook's RPG locks on in 0.6 s instead of 0.8 and reloads in 1.8 s instead of 2.2. Nothing new to carry. |
| Nell | Sticky Bombs | 3 bombs. Thrown in an arc up to 18 m; sticks to the first car or ground it touches; beeps for a 3 s fuse; blast 25 armor to a car and 60 health to a fighter, radius 5 m (6 m with Nell's perk). |
| Jax | Grapple | A 25 m line. Aimed at a car moving under 90 km/h, it pulls Jax onto the roof (boarding, section 2). Aimed at a ledge with a salvage crate, it pulls him up. 6 s recharge. **Jax becomes active.** |
| Odessa | Scrap Turret | Deploys one turret on the ground for 20 s. It fires at the nearest enemy car within 35 m every 0.8 s for 4 armor (fighters 10 health). It has 60 health and can be destroyed. 30 s recharge after it goes. |
| Cinder | Hand Flamer | A cone 6 m long and 35 degrees wide: 10 armor per second to cars, 30 health per second to fighters and raiders. 4 s of fuel, refilling at half a second per second. Cinder is immune to fire, including the Flamethrower. **Cinder becomes active.** |
| Dune | Marksman Crossbow | Right click zooms 3 times. Bolts fly at 90 m/s up to 150 m: 15 armor to a car, and a fighter or raider is knocked down in one hit. 8 bolts, 1.5 s reload. |
| Wren | Smoke Grenades | 2 grenades, thrown up to 20 m; each leaves a smoke cloud 5 m across for 6 s using the arsenal's smoke (blocks computer sight and lock-ons). |
| Tusk | Scrap Cannon | 2 shells, 4 s reload. A hit on a car deals 20 armor and shoves it as if a 1,450 kg car hit it at 35 mph (through the crash solver); a fighter is knocked down. Tusk's perk: walking into a parked car pushes it at 1 m/s. **Tusk becomes active.** |

Computer fighters (section 3) use the same gear with the same numbers.

### Car weapons against fighters on foot (settled 30 September 2026)

Car weapons hit fighters on foot (the player's crew, computer crews and
raiders), using the fighter's own body, not a car's box:

- **Crossbow bolt from a car:** 35 health; no knockdown. A full-health
  fighter survives two bolts and goes down on the third. Dune's Marksman
  Crossbow keeps its one-hit knockdown.
- **Bomb and other car splash:** the same falloff as against cars, up to 60
  health at the centre (the sticky bomb's number); a fighter inside half the
  blast radius is also knocked down.
- **Carried cargo** (fuel, and later any carried item): a fighter drops it
  only when knocked down. A hit that does not knock the fighter down keeps
  the cargo, which is the on-foot match for a car's "more than 25 armor in
  one hit" rule.
- A car running into a fighter already knocks them down (vehicle sweeps);
  unchanged.

## 2. Boarding (CREW-03)

Boarding is the on-foot finishing move. It must feel daring but stay simple.

- **Getting on.** Anyone can board a car moving under 50 km/h by jumping and
  landing on its roof. Jax can grapple onto a car moving under 90 km/h from
  up to 25 m. Only enemy cars can be boarded (rival, computer cars, the
  convoy), never traffic or your own car.
- **On the roof.** The fighter holds on to the roof mount point and moves
  with the car. A computer driver swerves to shake them off. The fighter is
  thrown clear (no damage, lands beside the car) if the car turns hard
  (sideways acceleration over 9 m/s² for 0.3 s), takes a crash with more
  than 10 mph change in velocity, or after 6 s.
- **The charge.** Hold fire for 1 s to plant one charge. The fighter then
  jumps clear on their own (always a safe landing beside the road). The
  charge blows 2 s later: 35 armor, and the car's weapons are disabled for
  0.8 s. One charge per boarding.
- **Tells for the victim.** A boarded car shows a fighter on its roof and a
  blinking charge; the player's own car can be boarded by computer fighters
  only on Hard, in Ambush Alley and the Convoy Raid, never in ordinary Mad Max
  races.
- **Tests.** Speed limits (49 and 51 km/h; Jax 89 and 91), the shake-off
  rules, one charge, safe landing, and determinism at 30, 60 and 144 frames a
  second.

## 3. Computer crews get out (CREW-04)

- **Every computer car has a crew member,** picked from the seeded field, so
  their fighters look and fight like the player's.
- **Repair stops (Medium and Hard).** When a computer car's armor is under 30%,
  no enemy car is within 80 m, and it is more than 400 m from the finish, it
  pulls over, its fighter gets out, repairs 40 armor over 4 s (2 s for Odessa)
  and drives on. At most once a lap.
- **Ambushes (Hard only).** When a computer car leads the player by 150 to
  400 m and reaches a raider ambush zone, it pulls over, its fighter gets out
  with the RPG, fires up to three rockets at the player as they pass (usual
  Hard lock and aim), and gets back in. At most once a lap, never in the last
  500 m.
- **The player can fight back.** Knocking the fighter down leaves the car
  parked until the fighter respawns beside it (3 s). Ramming a parked car
  works as usual.
- **Tests.** The conditions above, including "never on Easy", "never near
  the finish", and a full Hard race where an ambush really happens and the
  race still completes.

## 4. Cards

| Card | Scope | Needs |
| --- | --- | --- |
| CREW-02 | The `crew-gear` switch and all eight items; Jax, Cinder and Tusk active | ARS-CORE (smoke hazards and car effects) |
| CREW-03 | Boarding, including Jax's grapple onto cars | CREW-02 |
| CREW-04 | Computer crews: repair stops and Hard ambushes, with gear | CREW-02 |

Fighters, figures and first-person hands are the existing ones; the better
crew art comes through the ART-SRC-CREW and ART-SRC-HANDS sourcing cards.
Gear models are simple shapes built in code or small CC0 props (a turret, a
grapple hook, a canister), recorded in `tools/art/catalog.json`.
