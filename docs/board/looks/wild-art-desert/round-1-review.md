# WILD-ART-DESERT, round 1

Sheet: `round-1.jpg` (496,892 bytes), all six animals. Each animal has two rows: two
photographs of the real animal beside close views of the exported model, then what a player
sees: 1:1 crops of a 1920 x 1080 frame from a car (the race camera's 54 degrees, 1.6 m up) at
10 m and 30 m; the pelican and the condor are shown flying from below, from the side and 25 m
overhead instead. Three drafts were looked at and fixed before this sheet; they are not rounds.

## Claude's verdict (builder and judge on this card)

| Animal | Verdict | Why |
| --- | --- | --- |
| Roadrunner | PASS | The photograph's bird: long neck carried forward, shaggy dark crest, heavy bill, streaked brown and buff plumage with a plain pale belly, long dark tail cocked up, long pale legs with two toes forward and two back. At 10 m the outline alone names it. Runs with head, body and tail in one level line. Weak points: the white tips of the tail are faint and the neck's streaks are coarser than the photograph's. |
| Jackrabbit | Not yet | It is a hare, not a rabbit: lean, arched back, long folded hind legs, ears as long as the head and neck, cupped, pink inside, white-edged and black-tipped, black tail, grizzled coat. The forelegs are two straight pegs out of the chest; the haunch sits on the flank like a plate with a hard edge; in the bound the feet dip 10 mm into the ground. |
| Desert bighorn | Not yet, close | A ram's outline, nothing of the deer left: deep chest, short thick neck, heavy horns that rise from the skull, curl behind the ear and come forward under the cheek. Pale sandstone coat, white rump and muzzle. The coat is one flat tan; the photograph has dark fronts to the legs, a paler belly and a darker neck. The muzzle is too thin under those horns. |
| Collared lizard | PASS | Big blunt pale head, two black collars with white between, blue-green body with yellow crossbands and pale spots, yellow forefeet, long hind legs and toes, pale spotted tail twice the body's length, chest held high on straight forelegs. At 10 m it is a small green lizard with a pale head; at 30 m a speck, as the real animal would be. |
| Pelican | Not yet, close | Standing, it is a brown pelican: long dark bill laid down the neck, white head, chestnut neck, silver back with dark streaks, dark belly. Flying, the head rides on the shoulders with the bill out in front. The body is a smooth egg, the legs thin pegs under it, and the folded neck in flight is a white lump. |
| California condor | Not yet | Standing: hunched black bird, small bare orange head in a spiked ruff, white bar on the folded wing, feathered thighs. Flying: very long broad wings with seven fingers, held flat. The white triangle under each wing, the mark of the bird in the air, is there but shows only as a dull tan patch; the standing bird's back is one smooth shell. |

## Numbers

| Animal | Triangles | GLB bytes | Map | Size L x W x H, m (Idle) | Lowest point, Idle / motion, mm |
| --- | ---: | ---: | ---: | --- | --- |
| Roadrunner | 1,968 | 497,716 | 512 | 0.54 x 0.10 x 0.33 | 0.0 / -1.1 |
| Jackrabbit | 2,312 | 515,780 | 512 | 0.58 x 0.22 x 0.51 | -3.9 / -10.3 |
| Desert bighorn | 4,375 | 1,867,364 | 1024 | 1.78 x 0.63 x 1.33 | 0.0 / -9.5 |
| Collared lizard | 2,988 | 537,944 | 512 | 0.36 x 0.25 x 0.10 (0.41 m with the tail straight) | -1.8 / 0.0 |
| Pelican | 1,950 | 446,600 | 512 | 0.68 x 0.26 x 0.58, span 2.1 | -1.0 / flies |
| California condor | 1,948 | 420,092 | 512 | 0.69 x 0.35 x 0.69, span 2.9 | -0.7 / flies |

The collared lizard is a large male a little over life size (0.41 m; the biggest are about
0.35 m). The roadrunner has Idle and Run and no flight loop: it is a ground bird, and
`src/wildlife.js` already lists it as one.

## Photographs (reference only, never in the game)

Wikimedia Commons, public domain or CC0, listed in `tools/blender/wildlife/desert-references.json`:
roadrunner, Robb Hannawacker and Joshua Tree National Park (public domain); jackrabbit, Joshua
Tree National Park and Scott Rheam, U.S. Fish and Wildlife Service (public domain); desert
bighorn, Andrew Cattoir, Lake Mead National Recreation Area (public domain); collared lizard,
David Whelan and Patrick Alexander (CC0); brown pelican, LunarEcho87 and Hobbyfotowiki (CC0);
California condor, U.S. Fish and Wildlife Service and Phil Armitage (public domain).

## Next round

Jackrabbit: shoulders and shaped forelegs, the haunch blended into the flank, feet on the
ground through the bound. Bighorn: dark leg fronts, paler belly, darker neck, a deeper muzzle.
Pelican: a keeled breast and heavier body, stout legs set apart, a neater folded neck. Condor:
brighter and larger underwing triangles, broken feather edges on the back. Roadrunner and
collared lizard: unchanged.
