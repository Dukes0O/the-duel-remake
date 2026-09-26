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
