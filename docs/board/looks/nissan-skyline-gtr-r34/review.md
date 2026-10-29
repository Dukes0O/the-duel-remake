# R34 shape: round 1 self-review

Claude's art verdict is pending. This is a shape-stage handoff, not a release
or a claim of photographic fidelity. Stop after this round.

The paired front, rear, left side and front three-quarter views compare the
actual code-built geometry with V1's supplied synthetic references. The model
views are Blender renders of the builder export, not in-game screenshots.
References are viewing guides only. The sheet includes no copied runtime art.

## Self-scores (1 to 5)

- Resemblance: 3. The long bonnet, upright coupe cabin, short boot, broad
  shoulders, four round lamps and tall separate wing identify the R34.
- Readability: 4 in these static views. Driving readability is not tested.
- Grounding: 4. All four actual tyres contact local zero in the contract test.
- Consistency: 3. Blue metallic paint and silver wheels fit a road car;
  the current surfaces remain simpler and more angular than the references.
- Geometry cost: 4. 56,577 visible triangles and 48 draws, below 60,000/56.
  No frame timing claimed or run.

## Five largest remaining differences

1. The roof and windscreen corners are too sharp; the reference has rounded
   stamped-metal corners and a subtly bowed roof.
2. The front bumper and rear quarter transitions need more shaping. The front
   intake and side mouths currently read as shallow dark panels.
3. Headlamps and rear lenses need depth, lens rings and less uniform light.
4. The shoulder and arch bulges need stronger compound curves, especially
   the rear haunch and the wheel-to-bumper transitions.
5. Glass is too clear and the cabin is too simple; the reference has darker
   glazing, seals and a less exposed interior.

Within round 1, self-inspection corrected cropped views, white headlamp
panels, heavy spokes and weak front arch shoulders. The shared wheel builder
now uses five silver split spokes, as the packet asks. Red calipers, twin
exhaust tips and left-seat driver follow the packet's explicit decisions.
No badge, maker texture or model is used.

Final sheet: 259,070 bytes. The requested scratchpad JPG is byte-identical.
Front, rear and side use orthographic cameras for shape comparison; the
three-quarter view uses perspective. All four full-car views were inspected.

## Rebuild the sheet

1. Export with `node tools/art/car-review-export.mjs skyline-vehicle.js createSkylineVehicle .evidence/2026-10-28/NISSAN-SKYLINE-GTR-R34-V2/skyline.glb`.
2. Run Blender with `-b --factory-startup -t 2 --python tools/art/skyline-review.py -- --root . --glb .evidence/2026-10-28/NISSAN-SKYLINE-GTR-R34-V2/skyline.glb --out .evidence/2026-10-28/NISSAN-SKYLINE-GTR-R34-V2`.
3. Compose with `python tools/art/skyline-sheet.py .evidence/2026-10-28/NISSAN-SKYLINE-GTR-R34-V2`.

The blue body remains behind nissan-skyline in dev and is not buyable. V3
owns final details and V6 owns shop integration. Claude decides any next round.
