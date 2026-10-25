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

## Rounds 1 and 2 (sheets removed when round 3 was committed; one version per binary)

Round 1: the blueprint passed (kept as it is, curl included); the car read as an open
hover-kart and was rebuilt. Round 2: much closer; the teardrop, the cut-off tail with
two round exits and the red lamp, the charcoal and the thin green line were kept.
Claude asked for exactly four changes.

## Round 3 (sheet removed when round 4 was committed)

1. **Fenders:** the flat half-moon pods are now rounded fenders that grow out of the
   body: a lathe-swept shell round each axle, curved in plan and in section, its outer
   face about flush with the tyre, the outer lip turning in toward the wheel, the
   top edge following the wheel in a smooth arch and both ends folding down into
   the sill.
2. **Skirt and splitter:** the skirt is black and tucked inside the body's outline,
   visible as a dark band low down, no longer a plank; a shallow black splitter under
   the nose only, no green on it. The green line now runs along the flanks between
   the fenders only.
3. **Smoother body:** the shell is now a smooth loft with a 32-point rounded
   cross-section (rounded at the top, squarer at the floor, widest at the shoulder)
   through 11 stations, so there are no facets where the nose meets the sides or
   over the roof; the nose is lower and rounder.
4. **Canopy:** the glass is near-black from every angle (non-reflective), the
   helmet just shows through.

Size: 48,162 triangles and 56 draws (cap this round: 50,000 triangles).
Still true: this session could not open photographs.

## Round 4 (final: Kyle lifted the cap for one last pass)

Kyle sent a dozen real photographs of the car to Claude, who found that the earlier
"smooth teardrop" description was wrong. The car was rebuilt (`src/speirling-vehicle.js`)
to Claude's reading of those photographs (this session saw no photograph itself: its
browser tool failed the policy check every time; the views used are Claude's, which are
not committed):

1. **Stance:** very low and wide like a small Le Mans prototype, 1.64 m wide, 3.47 m
   long, about a metre to the canopy top (1.24 m to the wing).
2. **Cabin:** a narrow central bubble of clear brown-tinted glass with a thin dark
   frame, so the seat and driver show; set down in a low tub between the fenders, its
   sides running down to the tub's sill line.
3. **Front fenders:** two tall separate pods over the front wheels, higher than the
   nose, with a deep channel on each side of the canopy and a small light on each tip.
4. **Nose:** a wide flat low black intake across the whole front, its top edge a
   shallow W, fine vertical slats, a thin vertical white light strip at each outer
   corner.
5. **Sides:** a large dark intake in each rear haunch behind the door; mirrors on thin
   stalks from the fender tops; wide muscular rear haunches over the rear wheels.
6. **Rear (corrected from Kyle's rear-view photographs):** no round fan exits. Behind
   the cabin the body splits into two tall rounded haunches over the wheels with deep
   tunnels either side of a narrow central spine: a tall dark pod down the middle of the
   tail tapering to a point, a small blank panel near its top, a red diamond light low at
   its point, and a thin central fin from the canopy's top back to the wing. Either side
   of the spine a large rectangular black mesh grille (the fan and radiator exhaust), set
   deep, with the fans still hidden behind it (nodes of their own). Two round red ring
   lights, one above the other, on each haunch's rear face. Under it all a black diffuser
   with vertical strakes and a small plate panel at the bottom centre. A wide black wing on
   two swan-neck mounts from the haunch tops.
7. **Wheels:** big dark multi-spoke slicks, the lower half showing.
8. **Paint:** metallic blue-grey, a black lower body, intake and diffuser, a light
   dusting of track grime low down; the green line is dropped.

Size: 49,099 triangles and 57 draws (cap 50,000); 1.64 x 3.47 x 1.24 m with the wing.
