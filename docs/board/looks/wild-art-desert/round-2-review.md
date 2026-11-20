# WILD-ART-DESERT, round 2 (final)

Sheet: `round-2.jpg` (456,491 bytes): the four animals changed since round 1, in the same
layout (two photographs beside close views, then 1:1 crops of what a 1080p frame shows). The
roadrunner and the collared lizard passed in round 1 and are on `round-1.jpg`, unchanged. Each
of the four was built once or twice this round and looked at before the sheet was counted.

## Claude's verdict (builder and judge on this card)

| Animal | Verdict | Why |
| --- | --- | --- |
| Roadrunner | PASS (round 1) | Unchanged. |
| Jackrabbit | PASS | The photograph's hare: lean arched body, long folded hind legs, thin straight forelegs, huge cupped ears with pink skin, white rims and black tips, black tail, grizzled grey-buff coat. At 10 m it cannot be taken for a rabbit. Weak points: the gathered half of the bound is stiff when seen close, and for one instant of the push-off a toe is 9 mm into the ground. |
| Desert bighorn | PASS | A stocky ram with horns that rise from the skull, curl behind the ear and come forward under the cheek; sandstone coat with a darker neck, white rump round a dark tail, white muzzle, pale belly. At 30 m the horns and the white rump name it. Weak points: the coat is smooth and even, and the dark fronts of the legs are fainter than the photograph's. |
| Collared lizard | PASS (round 1) | Unchanged. |
| Pelican | PASS | Standing: the long dark bill laid down the neck, white head, chestnut neck, silver back streaked dark, heavy dark-bellied body on short dark legs with webbed feet. Flying: head drawn back on the shoulders, bill out in front, long dark wings. At 30 m the white head and the bill name it. Weak points: the body is a simple shape close up, and the folded neck in flight is a pale lump. |
| California condor | PASS | Standing: a hunched black bird with scalloped feathers, a small bare orange head in a spiked ruff, a white bar on the folded wing, feathered thighs. Flying: very long, broad, flat wings with seven fingers, and under each a pale triangle that is plain against the black from below and from a car. Weak point: the triangles are tan, not white, because the underside of a flying bird is lit only by the ground. |

All six pass. They are judged at the distances a player sees them (10 to 30 m from a car; the
two soaring birds from below and overhead). None is a close-up hero model.

## Numbers

| Animal | File | Clips | Triangles | GLB bytes | Map | Size L x W x H, m (Idle) | Lowest point, Idle / motion, mm |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| Roadrunner | `roadrunner.glb` | Idle (5 s), Run (0.4 s) | 1,968 | 497,716 | 512 | 0.54 x 0.10 x 0.33 | 0.0 / -1.1 |
| Jackrabbit | `jackrabbit.glb` | Idle (5 s), Walk (a bound, 0.53 s) | 2,344 | 520,760 | 512 | 0.58 x 0.20 x 0.51 | 0.0 / -8.8 |
| Desert bighorn | `desert-bighorn.glb` | Idle, Walk, and the deer donor's 11 others | 4,375 | 1,867,740 | 1024 | 1.78 x 0.63 x 1.33 | 0.0 / -9.5 |
| Collared lizard | `collared-lizard.glb` | Idle (5 s, bobs its head twice), Walk (0.8 s) | 2,988 | 537,944 | 512 | 0.36 x 0.25 x 0.10 (0.41 m with the tail straight) | -1.8 / 0.0 |
| Pelican | `pelican.glb` | Idle (stands), Fly (1.4 s beat) | 1,950 | 450,084 | 512 | 0.68 x 0.26 x 0.58, span 2.1 | -2.3 / flies |
| California condor | `condor.glb` | Idle (stands), Fly (3 s soar) | 1,948 | 448,456 | 512 | 0.69 x 0.35 x 0.69, span 2.9 | -0.7 / flies |

All are in metres with the feet at the origin and the nose along +X. The donor clips keep
their donor names (`Eating`, `Gallop`, `Idle_2` and so on; each also under `AnimalArmature|...`).
The six files in `public/assets/wildlife/` are byte for byte the candidates judged here.

## What changed since round 1

| Animal | Change |
| --- | --- |
| Jackrabbit | A shoulder inside the chest and a tapered foreleg coloured as the coat above the elbow; the haunch sunk into the flank and coloured as the flank; no breathing scale on the bone that carries the legs (it lifted the feet 4 mm); the bound sets the hare on the ground from its lowest foot each frame. |
| Desert bighorn | A deeper, blunter muzzle; darker neck and shoulder; paler belly; dark fronts and pale backs to the legs, measured from each leg bone's own line; more variation in the coat. |
| Pelican | A heavier body, deepest at the breast; stouter legs set wider. |
| California condor | Larger, whiter underwing triangles; paler feather edges over the back and the folded wings, drawn as fine marks. |

## Photographs (reference only, never in the game)

As in round 1: Wikimedia Commons, public domain or CC0, listed in
`tools/blender/wildlife/desert-references.json`.
