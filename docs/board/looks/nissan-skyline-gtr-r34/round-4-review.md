# R34 shape: round 4, self-review

Kyle brought the car back after Claude scored round 3 at 3 of 5: closer at the
front, but the cabin and roof read as a boxy saloon, the arches did not flare
and the rear deck was too tall and square. Round 4 changes the method: the body
is shaped from the photo outlines, not from guessed boxes.

## Method

1. `tools/art/skyline-outlines.py` thresholds the car against the grey studio
   background in the side, front and rear pictures and writes
   `tools/blender/cars/r34-outlines.json`: the roofline and underside from nose
   to tail, the window openings, and the half width at each height from the
   front and rear. Scaled to the real car: 4.60 m long, 1.785 m wide, 1.36 m
   high, 2.665 m wheelbase. The front and rear widths are corrected for camera
   distance (the roof is farther from the lens than the wings, so it looks
   narrower in the photo than it is). The wing, mirrors and floor shadow are
   removed from the outlines first.
2. The Blender recipe lofts one cross-section every 1.2 to 2.6 cm. Each runs from
   the underside line up to the roofline from the side outline. Its width at
   each height comes from the front and rear outlines. So the roofline, the
   fast rear screen, the short deck, the bonnet and the nose follow the picture.
3. Flared arches are cut as rounded openings with dark wheel houses and a rolled
   lip. The doors are 4.5 cm narrower than the wings, so the arches stand proud.
4. The glasshouse is a painted shell. Window panes are laid on it as separate
   dark inserts with black seals, and the pillars stay painted. Headlamp lenses,
   projector circles and fog lamps are laid on the nose surface the same way.
5. `tools/art/skyline-overlay.py` projects the finished model back over each
   reference and scores the overlap of the two silhouettes.

## Fit against the references

Silhouette overlap, 1 being exact: side 0.96, front 0.89, rear 0.89. In the side
view the model outline and the photo outline lie on top of each other along the
roofline, bonnet, rear screen, deck, nose and tail (the side overlay on the
sheet). Front and rear lose points to the tyres, mirrors and wing, which are
simple boxes and cylinders, and to the shadow under the bumpers.

## Result

**Self-verdict: 3.5 of 5 resemblance.** Claude decides the art verdict.

- Resemblance: 3.5. The proportions, roofline, glasshouse shape, fast rear
  screen, short deck, long low bonnet and flared arches now follow the
  photographs. The surfaces and the fine parts do not.
- Static readability: 4. It reads as an R34 coupe at sheet size, from every view.
- Grounding: 4. The contract checks tyre contact, clearance and tumble.
- Consistency: 3.5 in this neutral studio. Course lighting is unmeasured.
- Geometry cost: 4. 57,708 visible triangles and 52 draws under 60,000 and 56.

## Five largest remaining differences

1. Surface character. The real body has bonnet bulges, fender creases, a haunch
   line over the rear wheel and a sill step. The model is smooth, so it looks
   softer and flatter than the photo.
2. The front fascia is built from flat boxes. The real bumper has layered
   corners, rolled ducts and a mesh grille with depth. Lenses lie on the surface
   and lack reflector detail.
3. The rear panel. The tail lamps are flat discs in a plain recess; the real car
   has shaped lamp pockets, a centre brake light and a layered diffuser.
4. Wing, mirrors and wipers are plain boxes. The wing blade and uprights are
   thinner and squarer than the real part.
5. The wheels are 0.37 m radius by contract; the photo wheels measure about
   0.34 m. The arches are therefore tighter than in the photo, and the spokes
   are simpler.

## Rebuild

1. `python tools/art/skyline-outlines.py` (only when the reference pictures change).
2. `blender -b -t 2 --python tools/blender/cars/nissan-skyline-gtr-r34.py -- --root .`
3. `node tools/art/skyline-export.mjs .evidence/<day>/<card>/skyline.glb`
4. `blender --background --factory-startup --python tools/art/skyline-review.py -- --root . --glb .evidence/<day>/<card>/skyline.glb --out .evidence/<day>/<card>`, then
   `node tools/art/skyline-silhouette.mjs .evidence/<day>/<card>/tris.bin` and
   `python tools/art/skyline-overlay.py .evidence/<day>/<card>`
5. `python tools/art/skyline-sheet.py .evidence/<day>/<card> 4`

No frame check applies. Delete raw review output after recording the verdict.
