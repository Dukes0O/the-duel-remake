# SIRENA-ART, the Falcone Sirena: look rounds (24 October 2026)

All models are original: the restored car is built in code with the classic
cars' own helpers (`src/sirena-vehicle.js`); the wreck, the five loose parts,
the lift bag and the abalone are written from the same body by
`tools/art/sirena-props.mjs` into `public/assets/models/sirena/` (one GLB each,
vertex colours, no textures). No downloaded model, texture, badge or logo.
Sheets are rendered in Blender:

```
node tools/art/car-review-export.mjs sirena-vehicle.js createSirenaVehicle .evidence/<date>/SIRENA-ART/sirena.glb
blender -b --factory-startup --python tools/blender/car-review.py -- --root . --glb <that glb> --out .evidence/<date>/SIRENA-ART/<round>/car
node tools/art/sirena-props.mjs --review .evidence/<date>/SIRENA-ART/props
blender -b --factory-startup --python tools/blender/sirena-review.py -- --root . --glb <props/id.glb> --out <round>/<id> --views three-quarter   (wreck: add ,rear-three-quarter,side,top)
python tools/art/sirena-sheet.py .evidence/<date>/SIRENA-ART/<round> docs/board/looks/sirena/round-<n>.jpg "<title>"
```

## Round 1 (sheet removed when round 2 was committed; one version per binary)

Claude's verdict: car proportions, nose stripe, wheels and roundel right; lift
bag accepted. Wreck read as scrap blocks rather than the same car; the cockpit
frame looked like a toy roll cage; paint plastic; badge had no emblem; the
abalone was the wrong shape; the door was a flat sheet.

## Round 2

Fixes, in the verdict's order:
1. Wreck: cut from the car's own shell, so the long nose, wing curves, cut-off
   tail, closed-coupe roof and pillars are the restored car's. Only the bonnet
   (between the wing seams), both doors and all glass are gone. Sunk to about the
   sills, nose down 2.6 degrees and rolled 3.4, cockpit and engine bay full of
   silt with the seat tops and the engine just showing. Rust-brown with patches of
   faded red on the flanks and the last of the white nose stripe; barnacles and
   weed on upward-facing skin only.
2. Restored car: a closed coupe with a bowed, wrapped-round windscreen in a slim
   chrome frame, a crowned solid roof and slim body-colour pillars (the red tube
   frame is gone); more gloss; stone chips on the nose, darker gaps round the
   bonnet, tail lid and doors; the nose crease is gone (the wheel-arch cut no
   longer steps the wing); lamp covers are domed glass with a glint.
3. Badge: red enamel with a gold ring, a white F and gold studs, crusted rim.
4. Abalone: an ear-shaped oval, low and flat, brick-red and rough, a curved row of
   six rimmed holes and the spire at one end, margin sunk into the rock.
5. Door: the curved panel including the shoulder, its window frame, handle and
   the 7 roundel, leaning on its edge.

Sizes: car 42,300 triangles / 49 draws (budget 73,600 / 66); the eight
models 0.88 MB together (limit 1.5 MB).

## Verdict

Accepted by Claude, round 2 of 3 (24 October 2026). The wreck reads as the same car as the restored one at a glance; badge, door and abalone are right; chips and lamp glass take the restored car out of toy territory. The in-game look comes with DEEP-SIRENA-VIEW.
