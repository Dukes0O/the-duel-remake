# LAB-HELI

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics; the helicopter is Claude's
line). LAB sections 4.1 and 4.2. Switch `lab` (dev). Needs LAB-RULES.

Apply `heliUpgrades(lab)` in the helicopter:

- `heli-flight.js`: thrust factor (1.08 x 1.05 or x 1.10), empty mass
  (-80 kg), the altitude falloff scale (10,000 m with the tune).
- `heli-cable.js`: the hook limit (2,000 kg) and the chosen line length
  (15 or 25 m) through the existing `lineLength` option.
- `heli-bucket.js`: 800 litres with the bigger bucket (weight follows), the
  ring from `DROP_AIM_RINGS[ring]`.
- `heli-fire.js`: the retardant load: filled only at the home pad, falls
  like water, marks forest cells it lands on (150 litres treat a cell) as
  unable to catch fire for the rest of that fire; it never lowers a cell
  that is already burning.
- `heli-session.js`: passes the upgrades in when a session starts; the pad
  menu offers water or retardant once the tank is owned, and 15 or 25 m.
- `tools/test-lab-heli.mjs`: with an empty Lab every helicopter test result
  is unchanged (the existing heli suites pass untouched); the Dusthawk lifts
  with a full tank and no upgrades; the Banshee lifts only with Engine 2 and
  the heavy hook; the 25 m line swings slower than 15 m (period within 5% of
  10 s and 7.8 s); retardant stops spread and puts nothing out; the summit
  thrust with the tune is 0.751 of sea level.

Owns: `tools/test-lab-heli.mjs`, `docs/changes/LAB-HELI.md`. Hooks: the five
helicopter files above. Locks: none (helicopter files are Claude's line;
check no helicopter card is open on the same files).
Sound: the existing bucket sounds; retardant uses the bucket drop with a
lower, thicker splash (`heli.retardant`, a variant of the bucket drop cue).
Art: the retardant is the existing water effect tinted red-orange.

Acceptance: the test, every existing heli suite unchanged, lane tier, build,
one review. Removed: nothing.

## Claude answers

Settled 24 October: (1) the optional `retardant` list in the saved fire record is fine; this card now holds the
`save-shape` lock, so it adds a save fixture for a fire with retardant, updates the save checker and gets the same
independent save review as LAB-RULES. (2) The one autopilot line is fine. (3) `labEnabled` in `src/app.js`, the fire
bar using the bucket's own `holds`, and drawing the pad actions are on the LAB-VIEW card; the retardant sound stays
with LAB-RADIO.
