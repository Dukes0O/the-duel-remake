# WILD-ART-WASTE, round 2 (final)

Sheet: `round-2.jpg` (476,821 bytes): the five animals changed since round 1, in the same
layout (photograph beside close views, then 1:1 crops of what a 1080p frame shows from a car
and from the town's camera). The scorpion passed in round 1 and is on `round-1.jpg`, unchanged.
The goat and dog were built once this round; the chicken and vulture twice and the monitor
three times, each looked at and fixed before this sheet was counted.

## Claude's verdict (builder and judge on this card)

| Animal | Verdict | Why |
| --- | --- | --- |
| Goat | PASS | Matches the photograph: blackish forequarters, brown back, off-white flank patch, face blaze, white hind socks, horns back and out, beard, tail up, low belly on short legs. Nothing of the deer donor is left in the outline. Weak points: the neck is a little long and the beard came out paler than the photograph's. |
| Chicken | PASS | A thin, upright, long-legged village hen as in the photograph: black-brown body, rusty neck, small red face and comb, a fan of tail feathers, bare yellow shanks. Pecks the ground in Idle. Close up it is simple; at 10 m it is a hen. |
| Camp dog | PASS | The photograph's dog: lean, deep chest, tucked belly, pricked ears, dark muzzle, tail curled over the back, short fawn coat. Nothing of the wolf donor's ruff or brush is left. Weak point: the coat is very even. |
| Turkey vulture | PASS | Standing: hunched dark body, small bare red head, short pale hooked bill, pale legs. Flying: wings held in a V with six fingers, silver flight feathers against a dark lining from below. Weak point: seen close from the side in flight the wing is a plain sheet. |
| Desert monitor | PASS | A monitor's outline from every side: long neck, low wide body, whip tail, bent sprawled limbs with five long clawed toes. Broken dark bands and pale spots on sand. Weak point: the coat is paler and softer than the photograph's. At 30 m it is a thin sliver the colour of the ground, as the real animal would be. |
| Scorpion | PASS (round 1) | Unchanged. |

All six pass. They are judged at the distances a player sees them (10 to 30 m from a car; the
three town animals also from 60 m up). None is a close-up hero model.

## Numbers

| Animal | File | Clips | Triangles | GLB bytes | Map | Size L x W x H, m (Idle) | Lowest point, Idle / motion, mm |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| Goat | `goat.glb` | Idle, Walk, and the deer donor's 11 others | 4,121 | 1,739,092 | 1024 | 1.09 x 0.50 x 0.85 | 0.0 / -5.5 |
| Chicken | `chicken.glb` | Idle (5 s, pecks twice), Walk (0.8 s) | 1,950 | 412,516 | 512 | 0.38 x 0.14 x 0.40 | 0.0 / -0.7 |
| Camp dog | `camp-dog.glb` | Idle, Walk, and the wolf donor's 10 others | 4,100 | 1,754,292 | 1024 | 0.99 x 0.21 x 0.72 | 0.0 / -5.6 |
| Turkey vulture | `turkey-vulture.glb` | Idle (stands), Fly (2.4 s soar) | 1,950 | 448,508 | 512 | 0.47 x 0.21 x 0.40, span 1.7 | -0.7 / flies |
| Desert monitor | `desert-monitor.glb` | Idle, Walk (1 s) | 4,788 | 895,356 | 1024 | 1.21 x 0.66 x 0.22 (1.4 m with the tail straight) | 0.0 / 0.0 |
| Scorpion | `scorpion.glb` | Idle, Walk (0.67 s) | 2,316 | 497,196 | 512 | 0.55 x 0.29 x 0.23 | -1.6 / -1.2 |

All are in metres with the feet at the origin and the nose along +X. The donor clips keep
their donor names (`Eating`, `Gallop`, `Idle_2` and so on; each also under `AnimalArmature|...`).

## What changed since round 1

| Animal | Change |
| --- | --- |
| Goat | Fully rough, low-shine material (the grey veil over the dark coat is gone); dust kept to the legs and belly; blacker forequarters; stouter front legs; slimmer horns. |
| Chicken | Thinner neck, larger head, black-brown plumage with rusty hackles, smaller thigh cones, matte material. |
| Camp dog | Paws left nearly at the donor's width; lower legs a little stouter. |
| Turkey vulture | Short deep hooked bill; legs 14 cm, body at 38 degrees, shorter tail (it clears the ground); body and folded wings smoothed; broader wing; brighter silver under the flight feathers; matte material. |
| Desert monitor | Finer body mesh (18 sides, 12 mm steps) so bands break up and spots show; each limb one bent tube from inside the body to the wrist, a small palm and five long toes with dark claws. |

## Photographs (reference only, never in the game)

As in round 1: Wikimedia Commons, public domain or CC0, listed in
`tools/blender/wildlife/waste-references.json`.
