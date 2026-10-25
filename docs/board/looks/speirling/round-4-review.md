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

Claude's instruction after Kyle's look: round 3 is "not all that bad"; one pass only.
1. **Side windows:** back, as dark-tinted glass continuing the canopy down the cabin
   sides in the shape of a door's glass.
2. **Photographs:** step 2 asked for a look at public photos of the real car (front
   three-quarter, side and rear) to correct the cabin position, the nose and its
   intake, the wheel arches and the tail. The browser tool navigated to Wikipedia's
   page but failed its policy check ("Policy check temporarily unavailable") on every
   screenshot and page read, three separate times in this session, so no photograph
   was looked at and no proportions were changed from pictures. Views used: none.
3. **Kept:** the teardrop, the dark canopy, the rounded fenders, the tucked skirt,
   the two round tail exits, charcoal with the green line.

Size: 49,016 triangles and 56 draws (cap 50,000); declared 1.45 x 3.37 x 1.2 m. The
sheet has the same six tiles.
