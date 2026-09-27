# Crash physics

Design for car-to-car crashes in every mode, written 26 September 2026 at
Kyle's request: "crashing into a vehicle should mimic the real physics that
would result in the other vehicle being smashed out of the way in some way
upon impact", in Mad Max Duel and Rival Duel alike. Claude sets the design
and builds the core; see the cards at the end.

## 1. What a crash should feel like

1. **Momentum is real.** A heavy, fast car smashes a light car out of the
   way; a light car bounces off a heavy one. The Titan (4.7 tonnes) ploughs a
   sedan aside and keeps rolling; a Viper (0.94 tonnes) that T-bones a truck
   comes off worst.
2. **Where you hit matters.** Hit a car from behind and it lurches forward;
   hit its side and it slides away and turns; clip a rear corner and it spins
   out (the classic pursuit trick). Head-ons stop both cars hard.
3. **A struck car reacts, visibly.** It slides and spins as a free body until
   its tyres bite again, then its driver recovers. A very hard hit on a light
   car lifts it and rolls it. Traffic that is smashed stays wrecked at the
   roadside: it keeps the speed the hit gave it, scrubs to a stop on tyre
   friction (never halting from speed in one moment) and ends beyond the
   nearest shoulder, never parked in the lane (CRASH-03).
4. **The player is judged by their own car.** Whether your car crashes (a
   race penalty in Rival Duel, armor in Mad Max) depends on how hard the hit
   was for *your* car, its change in velocity, not on closing speed alone.
   Rear-ending a slow car at speed hurts you; flicking a car aside with a big
   truck does not.
5. **Still fair.** A computer car that cuts into you is still put back rather
   than shoving you (the existing yield rule). Everything stays deterministic
   and headless.

## 2. The model

Each hit is solved once as a two-dimensional rigid-body impulse between two
boxes, using their real headings:

- **Bodies:** mass from the car; yaw inertia from its collision box,
  `m (L² + W²) / 12` with full length and width; velocity from speed along
  its heading plus any sideways push; spin rate from its yaw.
- **Contact:** the detected contact normal and a contact point between the
  two cars, offset from each centre, so off-centre hits create spin.
- **Impulse:** normal impulse with a low restitution (car crashes are mostly
  crumple, `e = 0.2`), plus tangential friction up to `μ = 0.45` of it. This
  is the standard rigid-body result; nothing is scripted per case.
- **Severity:** each car's change in velocity, `Δv`, in mph:

| Δv of a car | What happens to it |
| --- | --- |
| under 6 mph | Nudge: speed and a little sideways push; keeps control |
| 6 to 25 mph | Knocked: slides and spins freely for up to about a second, then recovers |
| 25 to 45 mph | Smashed: longer slide and spin, a hop, and for traffic, wrecked at the roadside |
| over 45 mph on a car lighter than its attacker | Launched: lifted and rolled; traffic is destroyed |

- **Knocked motion:** a struck computer car (traffic, rival, arena car,
  police) becomes a free body: it moves in world space at its post-impact
  velocity, slowed by sliding tyre friction (about 0.8 g) and with its spin
  damped, until it is nearly still, then its driver takes over from wherever
  it ended up. The player's car receives the same impulse as speed along its
  heading, sideways push and a spin rate that fades as the tyres grip;
  steering authority drops while it spins.
- **Player crash rule:** a crash (Rival Duel) or ram damage (Mad Max) comes
  from the player's own Δv. Mad Max keeps its armor rules and ram damage by
  closing speed, but motion always comes from the solver.
- **Mad Max roadside knock-away:** the scripted "shoved clear" motion becomes
  the physical knock; "obliterated" traffic keeps its debris burst.

## 3. Architecture

- `src/vehicle-collision.js` (new, pure): `vehicleBody(duel, actor)`,
  `solveVehicleImpact(bodyA, bodyB, contact)` returning each car's new
  velocity, spin and Δv, and `impactSeverity(dv, massRatio)`.
- `src/vehicle-knock.js` (new): `startKnock(actor, result)` and
  `stepKnock(duel, actor, dt)` for computer-driven cars; applied in the
  traffic, rival, police and arena steps before normal driving.
- `src/sim-contacts.js`: `_vehicleContact` keeps detection, the yield rule,
  the Titan crush and armor rules, and hands motion to the solver.
- `src/sim-driving.js`: the player's `spinRate`, integrated with steering and
  faded by grip.
- Tuning lives in one frozen table, `CRASH_TUNING`, in
  `src/vehicle-collision.js`.

## 4. Tests that guard it

- Momentum is conserved by the solver (within a small tolerance) and energy
  never increases.
- Rear hit: struck car gains forward speed, little spin. Side hit: struck car
  slides sideways and turns. Corner hit: struck car spins. Heavy on light: the
  light car's Δv is several times the heavy car's.
- The Titan hitting a sedan at 60 mph does not crash the Titan; a sedan
  rear-ending a stopped car at 60 mph does crash the sedan.
- A knocked car comes to rest and resumes driving; knocked cars never leave
  the world or pass through walls.
- The yield rule still protects the player from cut-ins.
- Race replays change only where cars touch; each changed fingerprint is
  reviewed and recorded in the change note. Mad Max combat balance stays in
  its bands.

## 5. Cards

| Card | Owner | Scope |
| --- | --- | --- |
| CRASH-01 | Claude | Solver, knocked motion, player spin and crash rule, integration in Rival Duel and Mad Max, tests, replay and balance review |
| CRASH-02 | Codex | Look and sound: sparks and crumple at the contact point, tyre smoke while knocked, roll visuals for smashed traffic, impact sounds scaled by Δv (SPEC 0.9) |
| CRASH-03 | Claude | Smashed cars slide to rest off the road |
| CRASH-04 | Claude | Mad Max Duel crash physics (section 6) |
| CRASH-05 | Claude | Mad Max cars are solids; late explosions; smouldering wreckage (section 7) |

## 6. Mad Max Duel (CRASH-04)

Kyle, 27 September 2026: crash physics felt right in Rival Duel but absent in
Mad Max, where armored cars should hit hardest. Ordinary rams already used the
solver in Mad Max; three older scripted rules took over at the moments that
matter. Mad Max now starts from the Rival Duel physics, with moderate extras.
These rules cover Mad Max on the road; the Scrapdome arena keeps its own tuned
rules.

1. **Wrecks keep moving.** A car whose armor runs out keeps the motion it had
   (plus the ram's impulse): it skids and spins to rest with no driver, stops
   at solid scenery, and recovers where it came to rest when its recovery time
   ends. The player's wreck plays out as a Rival Duel crash (a skid and spin).
   Before, every wreck stopped dead on the spot.
2. **Hard-hit traffic is wrecked and tumbles off.** The solver decides, as in
   Rival Duel. A smash (over 25 mph of Δv) or a launch wrecks the car, and its
   hulk slides and rolls off the road and stays there. A lighter hit shoves it
   clear. This replaces the old rule that made traffic vanish in a burst.
   (CRASH-04 also exploded every smash; CRASH-05 keeps explosions for hits
   over 250 km/h, section 7.)
3. **Damage follows F = ma.** Ram damage comes from each car's own change in
   velocity: 1.25 armor per mph of Δv above 8 mph, times 1.5 with front
   spikes, capped at 80. Δv already carries the other car's mass, so a heavy
   car hitting a light one deals much more than it takes: at 60 mph closing
   the Titan takes 50 armor off a Falcone and loses about 9; a Falcone takes
   about 7 off the Titan and loses 44. An equal-mass 60 mph rear-end removes
   28 armor, 42 with spikes (the closing-speed rule gave 19 and 29).
   Armor-kit plating adds its weight to the crash body (Scrapper 90 kg, Raider
   180 kg, Warlord 270 kg). A real armored car is heavier, not ten times
   heavier; the big differences come from the cars themselves (a Viper is
   0.94 t, the Titan 4.7 t) and from speed.
4. **A little more tumble.** Struck cars launch from 38 mph of Δv (Rival
   Duel: 45), roll a quarter further, and wrecks slide about a quarter
   further before stopping.
5. **Armor still steadies the player, less.** The player's own car spins from
   45 mph of Δv (the arena keeps 70; Rival Duel spins on any smash).

With the switch off, Mad Max keeps its released scripted rules. Tuning lives
in `CRASH_TUNING.madMax` and `COMBAT_TUNING.armor` (`ramDvThresholdMph`,
`ramDamagePerDvMph`).

## 7. Solid cars, late explosions, smouldering wreckage (CRASH-05)

Kyle, 27 September 2026, after playing CRASH-04: "Low speed bumps a car, but
high speed just goes right through it. The vehicle should be smashed ahead,
it's a solid." The struck car took the impulse but the attacker only paid a
small flat speed cost, so it kept most of its speed, caught the slower car
within a fraction of a second and, because wrecks and shoved cars were
scenery, drove through it.

1. **Both cars are solids.** A Mad Max hit on traffic gives each car its share
   of the impulse. The struck car is thrown ahead and to its nearest
   shoulder; the attacker loses real speed (about 0.6 of the closing speed
   against an equal car) but keeps control and takes no armor or crash cost.
   This applies to the player and to computer racers alike.
2. **Wrecks and shoved cars stay solid.** They can be hit again and are
   shoved along (one shove per touch). A touch below shove speed leaves them
   as they are.
3. **Explosions are for the big hits, after the smash.** Only a hit over
   250 km/h of closing speed blows the car up, 0.6 s later, where the hulk
   has been thrown, with a small extra lift. Below that the car is smashed
   (callout TRAFFIC SMASHED) and left as a hulk.
4. **Wreckage smoulders.** Wrecked traffic already stays for the whole race;
   now the twelve nearest wrecks within 450 m carry a smoke plume, and a
   blown-up hulk keeps a low glow of flame, so lap two shows lap one's
   carnage.

Tuning: `CRASH_TUNING.madMax.explodeClosingKph` (250),
`explodeDelaySec` (0.6), `rehitGapSec` (0.25).

