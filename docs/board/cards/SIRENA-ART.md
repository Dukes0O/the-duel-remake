# SIRENA-ART

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/THE_DEEP.md`; this card names the slice, files and acceptance.

Codex (Blender and the laptop screen). THE_DEEP sections 6.1, 6.2 and 6.5.
Switch `the-deep` (dev). Can start now.

The Falcone Sirena: a 1966 sports-racing car of the game's own make, low and
long-nosed with covered headlights, a short cut-off tail, spoked-look wheels
and the number 7 in a white roundel on each door; red with a white nose
stripe. A fictional homage in the spirit of the mid-1960s endurance cars,
with no real maker's badge (like the Falcone F42).

Make, from one recipe:
1. **The restored car** for racing: an original procedural body beside the
   F42 in `src/classic-vehicles.js` (preferred: the same helpers, damage,
   driver and paint), or a GLB from `tools/blender/sirena.py`. Same rules as
   the other cars: four wheels, driver, dents, glass cracks, brake lights.
2. **The wreck:** the same body after sixty years: red gone to rust-brown,
   barnacles and weed on the upper surfaces, doors and bonnet missing, half
   sunk in sand (a separate low-detail model).
3. **Five loose parts:** the enamel badge, the wood-rim steering wheel, a
   wheel, the bonnet, the door with the 7, each crusted to match.
4. **A lift bag:** a yellow, upright salvage bag with its strap.
5. **A red abalone** for the Kelp Coast pearls (a small shell on rock).

Reuse first: the classic-vehicle helpers and the Deep's existing crust and
kelp materials. One sheet per round in `docs/board/looks/sirena/`, at most
three rounds; Claude judges. No frame check (rule 9). Budget: the Sirena
like the other cars; wreck, parts, bag and shell under 1.5 MB together.

Owns: `public/assets/models/sirena/` (or the builder in
`src/classic-vehicles.js`), `tools/blender/sirena.py` if used, catalogue and
credit rows, `docs/board/looks/sirena/`, `docs/changes/SIRENA-ART.md`.
Locks: none. Sound: none.

Acceptance: the builder or exporter checks used for the classic cars
(wheels, bounds, damage reset, driver); Claude's verdict on a sheet; lane
tier and build. Removed: nothing.
