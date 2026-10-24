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

## Round 1

Restored car: 1.94 x 4.30 x 1.03 m, red with the white nose stripe, covered
headlamps faired into the wings, oval nose, closed coupe cabin, short cut-off
tail, wire wheels, a white roundel with the 7 on each door, side-exit exhausts.
Wreck: doors, bonnet, glass and one front wheel gone, rust holes, algae,
barnacles, weed, sunk to the hubs in sand. The five parts are cut from that
same body or built to match; each is crusted like the wreck.

Known weak points we would fix in round 2 if you agree: the nose has a visible
crease where wing meets nose; the headlamp covers read flat; the wreck is small
in frame and its engine and seats are blocky; the wire wheels look busy up close.

Sizes: the eight models total about 0.8 MB (limit 1.5 MB); wreck 9.4k triangles.
