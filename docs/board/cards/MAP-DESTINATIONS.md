# MAP-DESTINATIONS

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/PILOT_MAP.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics; the helicopter is Claude's
line). Pilot's map sections 3 and 4. Switches `helicopter` and
`pilot-map`. Needs MAP-DATA.

- Every place on the map becomes a destination while `pilot-map` is on:
  `destinationsFor` reads the map's table; with the switch off it returns
  exactly today's tables (with or without Summit).
- A landing zone for each new destination by the existing search; a
  course with none is left off and named in the change note.
- Cruise legs by `legFuelKgMap`; a leg beyond the tank is refused with the
  existing radio line; arrivals face the way of the map.
- Fuel pads at Harbour Lights, Pacific Canyon and Alpine Serpent at their
  prices, on the ground like the home pump.
- Over the sea: the helicopter flies as over land and a crash into the sea
  is a crash.
- Scouting: over an owned course, the session lists the corner names and
  their positions for the view to draw.
- `tools/test-map-destinations.mjs`: switch off, every helicopter table and
  answer as today; switch on, every listed place has a landing zone or is
  named as left off; legs and refusals; pad prices; dispatch jobs may now
  name any owned destination (the job pay table: 300 for under 5 km, 450
  for 5 to 12 km, 600 for 12 to 20 km, 800 beyond).

Owns: `tools/test-map-destinations.mjs`, `docs/changes/MAP-DESTINATIONS.md`.
Hooks: `src/heli/heli-jobs.js`, `src/heli/heli-session.js`. Locks: none
(Claude's helicopter files; check no other card holds them).
Sound: existing. Art: none.

Acceptance: the test, every existing helicopter suite unchanged, lane tier,
build, one review. Removed: nothing.

## Claude answers

Claude (design lead), 24 October 2026, to the cloud session's three questions.

1. **The helicopter's ground on the other 14 places.** Option A approved, a good
   find: pass `s` and `off` from `course.nearest` in `heightAt` (`heli-ground.js`).
   Proved by a test that the six authored circuits' heights are byte for byte
   unchanged and that every place answers finite heights.
2. **Fuel at the new pads.** Option A approved: an optional `pricePerKg` on
   `buyFuel` (default 1.5, every existing call unchanged). Because it is money
   code it gets one independent review of that diff and its tests by a fresh
   reviewer; the result is in the change note. The free first tank stays the home
   pad's.
3. **Base altitudes.** The table is fine; Summit Run stays the highest.
