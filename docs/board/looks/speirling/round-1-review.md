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

## Round 1

The car: a tiny single-seat electric fan car, 2.08 x 3.34 x 1.05 m with its
wheels (very wide for its length), pearl white with orange trim and a dark
carbon floor. A closed glass canopy over one central seat with a roll hoop
behind it, a short body with a raised nose and a small front wing with end
plates, a rubber skirt all round the floor edge, slick tyres on open wheels, and
two big round fan housings at the rear with orange outlet rings and guard
grilles. The fans are nodes of their own (`userData.fans`) so a viewer can spin
them; each outlet has a nitro plume. 54,743 triangles and 59 draws (budget
73,600 and 66).

The blueprint: a 1.2 x 0.85 m blueprint sheet on four pins with a curling corner,
tape and a coffee ring: the Chaparral 2J (1970), the Brabham BT46B (1978) and the
Speirling (2022) as line drawings, and the Speirling in side and plan view with
the air's path from under the skirt into the fans.

Honest caveat for the verdict: this session could not open photographs (the
browser tool was unavailable), so the likeness comes from the public description
of the car and the card. Please judge it against real photographs: the fan
housing size and position, the canopy shape, the colours and how much of the
wheels is covered are the things most likely to need correcting in round 2.

Known weak points: the nose is lumpy where the front sections meet; the fan
housings read as large pods; the roll hoop is thick; the skirt is plain.
