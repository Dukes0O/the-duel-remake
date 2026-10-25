# LAB-FAN-ART, the McMurtry Speirling: look rounds (24 October 2026)

The car is built in code, like the Bolide: `src/speirling-vehicle.js` with the
shared car helpers, from public information about the real car as a viewing
reference only (no downloaded model, texture, badge or maker graphic; the maker's
name will live in the config, as for the other real cars). The pinned Project
Fan blueprint is one small model written by `tools/art/speirling-blueprint.mjs`
into `public/assets/models/speirling/`. Sheets are rendered in Blender:

```
node tools/art/car-review-export.mjs speirling-vehicle.js createSpeirlingVehicle .evidence/<date>/fan/speirling.glb
blender -b --factory-startup --python tools/blender/car-review.py -- --root . --glb <that glb> --out <round>/car
blender ... lab-review.py --glb <that glb> --out <round>/car2 --views top,left
node tools/art/speirling-blueprint.mjs --out .qa-dist/bp   (the review copy of project-fan.glb)
blender ... lab-review.py --glb project-fan.glb --out <round>/blueprint --views wall,side
python tools/art/speirling-sheet.py <round> docs/board/looks/speirling/round-<n>.jpg "<title>"
```

## Round 1 (sheet removed when round 2 was committed; one version per binary)

Claude's verdict: the blueprint passes as it is, curl included. The car read as an
open hover-kart with roll hoops, a bubble canopy and two drum fans on top, toy-like
and unlike the real car. Rebuild: a closed teardrop coupe, a jet-fighter canopy
blended into the body, the fans hidden with two round exits on a vertical tail, a
black skirt kept, wheel pods over the top halves, matte charcoal with a thin green
line and a little grime.

## Round 2

The car was rebuilt (`src/speirling-vehicle.js`), the blueprint is unchanged:

1. **Shape:** a tiny closed single-seat coupe, 1.48 m wide, 3.36 m long and 1.21 m
   tall, a smooth teardrop in side view: the roof peaks over the driver's head and
   sweeps down to a cut-off vertical tail; a low short nose with a small splitter.
2. **Canopy:** one dark tinted glass canopy fitted over the body's own surface and
   clipped to a jet-fighter outline, from just behind the nose to behind the
   driver's head. No bubble, no hoops, nothing open; the driver shows only faintly
   through the windscreen part.
3. **Fans:** hidden inside the tail (still nodes of their own for a viewer to spin).
   From behind, the tail's vertical face has two round exits side by side, 0.4 m
   each, dark with fine ring and spoke grilles, under a small rear lip, with the
   brake light bar across it.
4. **Floor:** the black skirt all round, a few cm off the road.
5. **Wheels:** black wheels on slick tyres; a pod over the top half of each, no
   exposed suspension.
6. **Colour:** matte charcoal, a thin green line along each flank, black skirt,
   dark canopy, road grime low on the flanks and nose.

Size: 48,334 triangles and 58 draws (round 1 was 54,743 and 59; budget 73,600 and 66).
Still true from round 1: this session could not open photographs; the shape
follows the description in the round 1 verdict.
