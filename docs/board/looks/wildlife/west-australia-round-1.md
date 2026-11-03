# Western mountains and Australia, round 1 of 3

Claude took over WILD-ART-SRC for this group (3 November 2026). Brief: every
count species for Summit Run and Panorama Ridge first, then the rest of the
Western mountains and Australia lists, plus the Tremblant Snow wolf tracks.
Gritty and real, never toy-like; Claude's own recipes from the best-fitting
licensed skeleton, or original where none fits.

## Claude's round 1 verdict

PASS, do not change: echidna, wolf tracks, coyote, mule deer.
PASS with one small fix: bighorn lower legs, brown in front like the body,
pale only on the back of the legs and the rump patch (they read as white
socks).

Round 2 fixes, judged against field photos of the real animal, gritty and
real, never smooth or toy-like:

1. Kangaroo (count species, most important): right shape, too smooth. A real
   fur coat with grain and soft mottling, grey-brown back, pale cream belly
   and inner legs, darker paws, feet, tail tip and ear backs. Thicker,
   muscular hind thighs and a heavier tail base. Keep the bound.
2. Cougar (count species): warm tawny, not greyish; white muzzle, chin and
   chest; black marks at the sides of the muzzle and behind the ears; dark
   tail tip. Head slightly larger and rounder, ears smaller and rounded.
   Fix the Walk dipping 17 mm below the ground.
3. Elk: rack about a third lower and swept back over the shoulders, unequal
   tines (longer brow and fourth); thicker neck with a dark mane down the
   throat; tan body with the pale rump.
4. Marmot: rebuild as a chunky rodent with a distinct head and neck, short
   visible front legs with claws, a short bushy tail of fur, grizzled brown
   back with buff tips, yellow-orange belly, pale band across the nose.
5. Kookaburra: big round head merged into the body (no cap line), heavy
   dark-and-pale bill, dark eye stripe, mottled brown back, blue wing patch,
   barred rufous tail.
6. Raven and cockatoo Fly: feathered wings, curved leading edge, separate
   primaries fanned at the tips (raven about 5 fingers, cockatoo rounder),
   thickness at the wrist, a gentle bend in the downstroke. Perched poses stay.

Small animals and birds may use 512 coat maps; large animals stay 1K.
Round 2 sheet: `west-australia-round-2.jpg`, changed animals only.

## Sheets (recycled after the verdict)

- `west-australia-round-1a.jpg`: mule deer, elk, bighorn sheep, cougar,
  coyote, yellow-bellied marmot, raven.
- `west-australia-round-1b.jpg`: eastern grey kangaroo, sulphur-crested
  cockatoo, kookaburra, echidna, wolf tracks.

Every picture is an actual import of the runtime GLB. Columns 1 and 2 use the
North woods cameras (14 m, 55 mm, side and three-quarter) at Idle frame 1;
columns 3 and 4 are close rear three-quarter frames of Idle and of the Walk
or Fly clip, because the marmot, echidna and birds are only a few pixels tall
from 14 m. No reference-photo column: Claude judges against real animals.

## How each was made

| Species | Recipe | Base |
| --- | --- | --- |
| Mule deer, elk, bighorn sheep | `donor_shape.py` + species file | Quaternius deer (CC0), every donor clip kept |
| Cougar, coyote | `donor_shape.py` + species file | Quaternius wolf (CC0), every donor clip kept |
| Kangaroo | `eastern-grey-kangaroo.py` | Original mesh and 20-bone rig; Walk is an in-place bound |
| Marmot, echidna | species file + `original.py` | Original mesh, shared quadruped rig and gait (`common.animate`) |
| Raven, cockatoo, kookaburra | species file + `bird.py` | Original mesh and bird rig; Idle perched, Fly looping |
| Wolf tracks | `tools/art/wolf-tracks.py` | Seeded 512 x 512 RGBA tiling decal |

Antlers, horns, crest and spines are part of each recipe. Coats are painted
per vertex (markings, grizzle, speckle) and baked with directional fur grain
into one 1024 map, as North woods. The birds' Idle swaps the spread flight
wings for sculpted folded wings by bone scale (the spread wings shrink into
the shoulder); the game sees only the two clips.

## Numbers

| Animal | Triangles | GLB bytes | Clips | Size L x W x H, m (Idle) | Lowest Idle / motion, mm |
| --- | ---: | ---: | --- | --- | --- |
| Mule deer | 4,515 | 1,759,056 | Idle, Walk + 24 donor | 1.97 x 1.15 x 2.27 | 0 / -4.9 |
| Elk | 4,403 | 1,739,228 | Idle, Walk + 24 donor | 2.70 x 1.28 x 3.32 | 0 / -6.6 |
| Bighorn sheep | 4,375 | 1,879,656 | Idle, Walk + 24 donor | 1.96 x 0.71 x 1.38 | 0 / -4.3 |
| Cougar | 4,300 | 1,889,436 | Idle, Walk + 22 donor | 2.11 x 0.47 x 0.92 | 0 / -16.6 |
| Coyote | 4,100 | 1,780,024 | Idle, Walk + 22 donor | 1.85 x 0.28 x 0.83 | 0 / -6.3 |
| Yellow-bellied marmot | 4,200 | 1,156,536 | Idle, Walk | 0.71 x 0.28 x 0.26 | -9.2 / -8.1 |
| Raven | 1,652 | 749,160 | Idle, Fly | 0.53 x 0.15 x 0.31 | -30.3 / -118.2 (Fly) |
| Eastern grey kangaroo | 4,600 | 1,050,584 | Idle, Walk (bound) | 1.76 x 0.50 x 1.58 | 0 / -0.7 |
| Sulphur-crested cockatoo | 1,996 | 1,082,832 | Idle, Fly | 0.34 x 0.14 x 0.44 | -79.7 / +6.2 (Fly) |
| Kookaburra | 1,652 | 1,002,788 | Idle, Fly | 0.31 x 0.16 x 0.33 | -67.6 / +72.5 (Fly) |
| Echidna | 4,974 | 1,135,884 | Idle, Walk | 0.49 x 0.36 x 0.22 | -3.5 / +9.8 |
| Wolf tracks | - | 210,896 (PNG) | - | 512 x 512 RGBA, 1.5 m tile | - |

Every coat map is 1024 x 1024. Sheets: 1a 336,693 bytes, 1b 239,495 bytes.

Lowest foot sample: the lowest vertex over six samples of each clip, in mm
(negative is below the ground plane). Bird Fly clips lift the bird 12 cm.

## Unsure, for Claude

- **Birds below their feet in Idle** (raven -30, cockatoo -80, kookaburra
  -68 mm): the perched tail hangs below the perch, as on a branch or post.
  On flat ground the tail tip would dip into grass. Fly numbers are relative
  to the origin of a bird that the game holds in the air.
- **Folded wings are separate sculpted shapes**: Idle scales the spread
  wings to nothing and shows the folded ones; Fly does the reverse. Three.js
  plays this as ordinary bone scale. If Claude prefers one wing mesh, round 2
  can fold it, at the cost of the slab look the first try had.
- **Raven Fly** wings still read as flat boards with cut fingers at the close
  view. **Kookaburra** head reads more like a cap than a big rounded head.
  Both are my weakest, with the **marmot**, still a smooth bean on short legs
  with a paddle-like tail despite the grizzle; not the gritty bar yet.
- **Cougar Walk** dips 17 mm (the shortened wolf legs over-reach). The
  marmot belly fur brushes 8 to 9 mm into the ground, as fur in grass would.
- **Elk** stands 3.3 m to the antler tips; the deer donor holds the head
  high (2.2 m). Real bull racks top out near 3 m.
- **Bighorn** lower legs read mostly white at the close Idle angle; real
  rams are dark in front with white backs.
- **Sizes**: new runtime files total about 15.4 MB, nearly all the 1K coat
  maps; birds and the small animals could drop to 512 maps if size matters.
- **Wolf tracks**: soft blurred holes rather than crisp pads, on purpose for
  snow; scale assumes 1.5 m per tile along the line.
