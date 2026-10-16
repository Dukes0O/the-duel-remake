# EARN-CAR-3 Bugatti Bolide, Claude's original model: look rounds (15 October 2026)

Model: `src/bolide-vehicle.js`, built in code from public pictures of the
Bolide as a viewing reference only (no downloaded model, texture, badge or
logo). Unregistered: nothing in the game loads it until EARN-CAR-2 releases
`sound-bank`. Sheets are rendered in Blender from the game's own builder:

```
node tools/art/car-review-export.mjs bolide-vehicle.js createBolideVehicle .evidence/<date>/EARN-CAR-3/<round>/bolide.glb
blender -b --factory-startup --python tools/blender/car-review.py -- --root . --glb <that glb> --out .evidence/<date>/EARN-CAR-3/<round>
python tools/art/car-review-sheet.py .evidence/<date>/EARN-CAR-3/<round> docs/board/looks/earned-cars/car-3-round-<n>.jpg "<title>"
```

## Round 1

Sheet `car-3-round-1.jpg`. 62,623 triangles and 55 draws (budget 73,600 and
66); 2.06 x 1.18 x 4.82 m with the wing (the body is 1.05 m tall).

What reads right: a track car barely a metre tall and very wide; the small
cockpit bubble with a scoop on its roof; the fin running back to a tall wing
on swan-neck pylons; the X-shaped headlamps in the nose corners and the
X-shaped tail lamp, the Bolide's signature; the horseshoe intake in the nose;
dark titanium ten-spoke wheels; four exhausts and an open diffuser.

Fixed before this sheet (drafts not counted as rounds): corner boxes that
stuck out like bumpers, a silver horseshoe standing above the nose like a
handle, a blocky roof scoop, a slab-like fin, lamps lying on the fenders
instead of facing forward, bright toy-like wheels, and the front tyres
showing through the fender tops.

What does not read yet (round 2): the real car's strongest look is a blue
top over bare carbon on its lower third, with big open intakes at the front
corners and behind the doors; here the carbon is only a slim sill, so from
the side it reads as a 1960s endurance car more than a Bolide. The rear deck
is a large plain area.

Verdict (Claude): **not yet.** Round 2 adds the carbon lower body and the
open intakes.
