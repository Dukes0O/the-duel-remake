# Western mountains and Australia, round 2 of 3

Claude's round 1 verdict and the fixes asked for are in
`west-australia-round-1.md`. Passed and unchanged (byte exact): echidna,
wolf tracks, coyote, mule deer. The North woods five are untouched.

Sheet: `west-australia-round-2.jpg` (373,277 bytes), the eight changed
animals only, same camera columns as round 1: 14 m, 55 mm side and
three-quarter at Idle frame 1, then close Idle and Walk or Fly frames.
Renders come from actual GLB imports.

## What changed

| Animal | Change |
| --- | --- |
| Bighorn | Legs brown like the body, darker low down; pale only on the back edge of the lower legs and under the rump patch. |
| Kangaroo | Furred outline (uneven sections), soft mottling and grizzled hair tips, coarse fur grain; cream belly and inner legs; dark paws, feet, tail tip, ear backs and rims; bigger hind thighs; heavier tail base. Bound unchanged. |
| Cougar | Warm tawny coat; white muzzle, chin, throat and chest; black whisker patches and black behind the ears; dark tail tip; head larger and rounder; ears smaller and rounded. Paws widened but no longer lengthened: Walk dip 16.6 mm to 7.3 mm, like the wolf it came from. |
| Elk | Rack a third lower and swept back over the shoulders; longest brow and fourth (royal) tines, short bez and trez; neck wider with a long dark mane hanging down the throat. |
| Marmot | Rebuilt: pear-shaped body tapering to a distinct short neck, broad flat head, small round ears, visible short forelegs with pale claws, a ragged bushy tail carried slightly up, grizzled back with buff tips, ragged yellow-orange flank edge, pale nose band, pale muzzle, buff cheeks. Unsmoothed outline so it reads as fur. |
| Kookaburra | Larger head on a full-width neck, rounder face taper; crown streaked brown with a soft edge; dark stripe through the eye to the nape; mottled brown back; solid blue shoulder patch on folded and spread wings. |
| Raven, cockatoo (and kookaburra) Fly | New wing: an arm-and-hand blade with a curved leading edge (forward to the wrist, swept back on the hand), thickest at the wrist, soft secondary scallops; separate primary feathers fanned from the hand (raven 5 slotted fingers, cockatoo 6 broad and rounded, kookaburra 6 short). The hand lags the arm through the downstroke and sweeps back a little on the upstroke. Perched poses unchanged. |

Coat maps: marmot, raven, cockatoo and kookaburra now 512; everything else
1K. The echidna stays 1K because it passed unchanged.

## Numbers

| Animal | Triangles | GLB bytes | Size L x W x H, m (Idle) | Lowest Idle / motion, mm |
| --- | ---: | ---: | --- | --- |
| Eastern grey kangaroo | 4,600 | 1,114,008 | 1.76 x 0.56 x 1.58 | 0 / -0.7 |
| Cougar | 4,300 | 1,912,104 | 2.12 x 0.48 x 0.92 | 0 / -7.3 |
| Bighorn sheep | 4,375 | 1,846,792 | 1.96 x 0.71 x 1.38 | 0 / -4.3 |
| Elk | 4,403 | 1,734,348 | 2.70 x 1.18 x 3.14 | 0 / -6.6 |
| Yellow-bellied marmot | 1,916 | 464,916 | 0.71 x 0.31 x 0.25 | -10.2 / -10.3 |
| Kookaburra | 1,740 | 425,316 | 0.31 x 0.16 x 0.32 | -67.6 / +73.6 (Fly) |
| Raven | 1,652 | 338,700 | 0.53 x 0.15 x 0.31 | -30.3 / -136.1 (Fly) |
| Sulphur-crested cockatoo | 1,988 | 467,248 | 0.34 x 0.14 x 0.44 | -79.7 / -1.4 (Fly) |

Bird Idle lows are tails hanging below the perch; Fly lows are relative to a
bird the game holds in the air.

## Unsure, for Claude

- **Marmot** reads as a groundhog-type marmot now, but its belly fur still
  sits 10 mm into the ground plane (grass would hide it), and the head is
  smaller than a real one's.
- **Kookaburra** head is bigger and the crown softer, but the face still has
  a crease where the head meets the neck at the close angle.
- **Raven Fly**: fingers read, but the inner wing is still a plain blade
  without separate secondary feathers; the bird budget (2,000) is the limit.
- **Elk** stands 3.1 m to the tips; the donor carries its head at 2.2 m.
- **Kangaroo** ears are tall thin blades; real ears are broader and cupped.
