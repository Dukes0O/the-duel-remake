# ART-FIT-TANKER

Kyle picked the Kenney delivery-flat cab and industrial tank. Claude settled
one rigid armored truck: no trailer, hitch or opening hatch. Original CC0
sources and licence records stay in the catalog and external art library.

## Final round three

- Rotate each complete native valve so its original red handwheel faces outward
  and measures about 0.6 m. Real pipe flanges still contact the native tank skin.
- Cap both pipe ports with approved container roof salvage painted tank colour.
  Three red bands around the lighter tank mark the valve targets.
- Use a thin dark steel boarding plate with diagonal warning paint only at its
  border. Two amber glass beacons stand on short dark posts at the front corners.
  The glass is about 0.4 m high; only it emits when all three valves are broken.
- Stripe the full rear bumper. Add stronger cab rust, low grime and an actual
  salvaged steel sheet across the lower windscreen.
- Keep the rigid model at 11 m long and 3.5 m tall. No race or save rule changes.

The actual renderer comparison, including a chase view 30 m behind a car,
uses the exact private model and manifest pins. Its first attempt captured nine
High yard views, then the chase fixture timed out after advancing before visual
readiness. The Director corrects that fixture before recapturing the same model.
Round three is final. Claude chooses the better of
rounds two and three for Kyle; no public installation or merge is cleared here.

## Tests

Tests first: the original 56 native checks passed; three new checks failed on
actual wheel size/orientation and beacon size/corner positions. Native acceptance
first passed 58 of 59, including all three new checks. The remaining exact
lineage failure was a Float32 vertex crossing a decimal rounding boundary.
A one-micrometre tangential fit correction preserves the original affine donor
mapping and contact precision. The corrected native rerun passes all 59 checks:
42 source/lifecycle checks, 12 contact checks, two dimensions and three final
wheel/beacon checks. Tests and contact tolerances are unchanged.

The candidate adds 460 triangles and eight draws over round two: native port
caps, the salvaged windscreen sheet and beacon posts. The corrected export is
6,788 triangles, 34 draws and 1.89 MB, below the advisory 8 MB file target.
The actual complete native assembly remains 3 m wide, 3.5 m tall and 11 m long.
Model, manifest and unchanged native logs are retained in private lane evidence.
SPEC 0.3's arena frame budget at both qualities still needs actual renderer
measurement; native counts are not a frame or look verdict.

Earlier source and output-planning gates passed without changing the approved
source bytes. The existing two duplicate-Three QA warnings remain unchanged.
No replay, signature, physics, lamp-health policy or save assertion changes.

## Removed

Replaced the small sideways wheels, dark open pipe holes, yellow roof grille,
tiny central lamps, flat cab paint and incomplete rear warning markings.
The long consumed testing transcript is folded into this note; its text history
remains. Original donor files, licensed records and both comparison rounds stay.
