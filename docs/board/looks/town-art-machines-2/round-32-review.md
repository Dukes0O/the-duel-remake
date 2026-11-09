# TOWN-ART-MACHINES-2 - round 32: drill rig

First round for the drill rig. The other six machines were not edited in the recipe. The photo references show one mast-free truck from four orthographic directions; a separate photo shows the detached open lattice mast lying flat.

## Export bounds (Blender metres, at rest)

- Body: min `(-1.462, -3.436, 0.383)`, max `(1.508, 3.372, 2.795)`.
- Cab end: min `(-1.462, 1.575, 0.383)`, max `(1.508, 3.372, 2.767)`. The cab is at Blender +Y.
- Mast: min `(-0.120, -2.812, 1.249)`, max `(0.120, 3.041, 2.130)`; hinge origin `(0, -2.700, 1.750)`, at the rear (-Y).
- String: min `(-0.105, -2.700, 1.825)`, max `(0.105, 3.000, 2.035)`; its rest origin is at the mast head.
- In the raised work pose, the exported string pipe reaches Z `-0.250`, below the ground line.
- Six photo-width tyres sit on the three measured axle centres. The body is carved from the rails up with an end split at the cab wall. The mast uses photo-traced slabs to keep the lattice holes open.

## Scores

| Measure | Score | Finding |
| --- | ---: | --- |
| Resemblance | 3/5 | The worn yellow truck, three axles, cab, and rear lattice mast read clearly. The carve has blurred projection seams on the cab and deck, and the deck edge is rough. |
| Readability | 4/5 | The mast lies along the truck at rest and stands at work. The string stays inside the mast at rest and feeds below ground when raised. |
| Construction | 4/5 | Photo-carved body, six separate tyres, frame rails, outriggers, pivot cradle, traced mast, and sliding steel pipe. No crawler tracks or old block drill pieces remain. |
| Frame cost | 4/5 | `test-blender-output.mjs` read back the family and passed its triangle and file-size limits. |

## Claude review

Please compare the four body views with the source photos, especially the front and rear wheel spacing, the cab and deck seams, and the top-view orientation. Check the mast rests along the deck, raises around the rear pin, and keeps the string inside at rest and below ground at work. Also check the raised mast framing in the sheet.

## Checks

- Blender 4.5.13 export: passed; per-piece bounds and ground/neighbour contacts printed before join.
- Work-pose string readback: Z min `-0.250`, below ground.
- `node tools/test-blender-output.mjs`: 389 checks, 0 failed.
- Lane tier and build: not run, as directed for this art card.
- Browser checks: Claude runs. Race fingerprints: not applicable; no simulation code changed.
- Submitted sheet: `round-32.jpg`, 212,349 bytes (500 KB maximum).
