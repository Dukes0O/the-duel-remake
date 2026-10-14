# HELI-FLIGHT

Kestrel One's flight rules, the autopilot and the ground under the
helicopter, from `docs/HELICOPTER.md` sections 3 and 4. Nothing in the game
imports these files yet; HELI-MODE wires them in behind the `helicopter`
switch.

## What landed

- `src/heli/heli-flight.js`: pure flight step at 1/120 s. Lift with thin
  air, ground effect and forward-speed lift; Assisted (levels itself, holds
  height, W/S ask up to 5 m/s) and Real (collective and tilt stay where you
  leave them); pedals; drag; fuel burn, low fuel and out of fuel;
  autorotation with stored rotor energy and a flare; touchdown classes;
  rotor strikes; instrument readout; a fingerprint for repeat checks.
- `src/heli/heli-autopilot.js`: off until P; holds height and heading, or
  flies to an approach point at 30 m/s with at most 10 degrees of tilt and
  stops 20 m above the landing zone; any input over 30% takes over.
- `src/heli/heli-ground.js`: ground height from a course's drawn ground,
  read lazily on a 4 m grid, and trees, buildings, rocks and mountains as
  obstacles for rotor strikes.
- `docs/HELICOPTER.md` section 3: a short list of the numbers this card had
  to settle (top speed in each mode, climb, hover burn, Assisted's soft
  descent, tilt and slide in touchdown classes, the flare, autopilot
  clearance).

## Checks

- `node tools/test-heli-flight.mjs`: 103 checks pass (hover holds, ground
  effect, thin air at Tremblant and Panorama Ridge with the heaviest car,
  forward-speed lift, top speed in both modes, Real holds collective and
  tilt, fuel burn and warnings, touchdown classes in the table and in real
  landings, autorotation sink and flares, rotor strikes on a tree and a
  cliff, mountains as cones at any height, the body check, the autopilot
  run and its climb up a 20% ramp, refuelling, bad numbers ignored,
  instruments, same inputs give the same flight, ground from Tremblant
  Woods including far from the road).
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 20 passed, 0
  failed, 0 not run in 267.85 s (after the review fixes; the first run
  before them was 20 of 20 in 251.79 s). The packet paragraph about the
  autopilot's look-ahead was written while that run went; no test reads it.
- `npm run build`: passed in 845 ms (the usual large-chunk warning only).
- Review (rule 17): one independent reviewer found three real faults: the
  course ground reading threw far from the road, the rotor check ignored
  mountains once the helicopter was more than 60 m above the ground, and the autopilot did not look ahead
  over rising ground. All three were fixed with tests, along with smaller
  notes (bad numbers, combined tilt, refuelling); the reviewer confirmed
  the fixes. HELI-MODE should call `refuelHeli` only on the pad.

## Changed assertions

None. No existing test changed.

## Race fingerprints

No race code changed and nothing imports `src/heli/`; the replay and world
signature guards in the lane tier pass unchanged.

## Sound cue

This card adds no sound. Its events (lift-off, touchdown, low fuel, engine
out, low rotor, crash, autopilot off) are the hooks HELI-RADIO and HELI-MODE
give sounds and radio lines.

## Removed

Nothing was replaced, so nothing was removed.
