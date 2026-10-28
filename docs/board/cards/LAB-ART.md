# LAB-ART

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Codex (Blender and the laptop screen). LAB sections 2 and 8. Switch `lab`
(dev). Can start now.

The Lab: a working hangar beside the home helipad, concrete floor with oil
stains, steel benches, pegboard tools, strip lights, the big door open onto
the pad. Gritty and real, a place where things get built, never a shiny
science centre. Inside:

- a weighing pad (Kestrel One's own model sits on it), weights and fuel cans;
- a drop tower over a sand pit with a target;
- a steel fire pit with a gas burner, a lid and a sand bucket;
- a pendulum frame with three cords and a stopwatch board;
- a rotor test stand;
- a bending rig with three bars;
- four glass jars with nails;
- a turning arm with a car-sized cradle;
- a map table;
- a small wind tunnel: a tunnel mouth with a big fan, a rolling road with a
  car on it, smoke streams, and a fan dial (with a REVERSE switch that is
  hidden until the secret opens);
- a launcher ramp and three snow trays (for the Snow group).

One recipe, `tools/blender/lab.py`, with small inputs only; reuse Kestrel
One, the car models, tyres and the fire, smoke and crust materials. One
sheet per round in `docs/board/looks/lab/`, at most three rounds; Claude
judges. No frame check (rule 9). Budget about 6 MB.

Owns: `tools/blender/lab.py`, `public/assets/models/lab/`, catalogue and
credit rows, `docs/board/looks/lab/`, `docs/changes/LAB-ART.md`. Locks:
none. Sound: none.

Acceptance: Claude's verdict on a sheet; the hygiene check (sources in
`tools/blender/`, only runtime files in `public/`); lane tier and build.
Removed: nothing.
