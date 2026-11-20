# WILD-ART-CITY, round 1

Sheet: `round-1.jpg` (479,571 bytes), all seven animals. Each animal has two rows: the
photograph of the real animal beside close views of the exported model, then what a player
sees: 1:1 crops of a 1920 x 1080 frame from a car (the race camera's 54 degrees, 1.6 m up) at
10 m and 30 m; each bird also in flight from below and overhead (25 m up, 30 m ahead); the
pigeon and the street cat also from the town's camera (48 degrees, 60 m up, looking down at
45 degrees). The ground is worn asphalt. Nine drafts were looked at and fixed before this
sheet (all seven animals four times, then the kite five more times and the cat four); they
are not rounds. An attempt at this card by Codex on 5 November (branch `codex/wild-art-city`) did not
pass and nothing of it is used.

## Claude's verdict (builder and judge on this card)

| Animal | Verdict | Why |
| --- | --- | --- |
| Black kite | PASS | The photograph's bird: pale tawny head, tawny breast, dark brown wings and back, yellow legs under feathered thighs, a long tail past the wing tips. In flight: long angled wings ending in six fingers, a forked tail, a paler patch under the outer wing. Weak points: the bill is heavier and more yellow than a kite's (it should be small and black with a yellow base); close up the plumage is smooth where the photograph is streaked; the fork is hard to make out at 30 m. |
| Little egret | PASS | A white heron on long black legs with yellow feet, thin neck, black dagger bill; flies with the neck drawn back and the legs trailing, as the photograph shows. Unmistakable at 10 m and still an egret's outline at 30 m. Weak points: the neck is a straight pole where the photograph's is an S, and the body is a smooth capsule with few plumes. |
| Black-faced spoonbill | PASS | White wader with the black face and the long flat black bill carried pointing down; the spoon shows from above, below and in front. Weak points: side on, the spoon is edge on and the bill reads as a plain long bill (as it does on the real bird); the legs hang a little below the body line in flight. |
| Pigeon | PASS | The photograph's blue-bar street pigeon: plump, upright, small head, dark blue-grey head and breast with a green neck, pale grey wing with two black bars, dark tail, red legs. At 10 m it is plainly a pigeon; at 30 m a grey speck; from the town's camera it is about 4 pixels long and shows only as movement. |
| Owl (a barn owl) | PASS | Upright on long white legs, white below, golden buff above, a large head with the white heart-shaped face, tan rim and dark eyes. Pale enough to show at night. Weak points: side on, the head is boxy; the feathered legs are plain white sleeves. |
| Raccoon | PASS | Arched back highest over the hips, black mask with white brows and muzzle, round pale-rimmed ears, bushy tail with dark rings, grizzled grey-brown coat. A raccoon at 10 m and at 30 m. Weak points: the legs and feet are blocky stumps close up; the coat is blotchy rather than long-haired. |
| Street cat | PASS | The photograph's cat: thin, long-legged, black cap, back and tail, white face, chest, belly and legs, tail carried up in a curve, large ears. Nothing of the wolf donor is left in the outline. A cat at 10 m and at 30 m; from the town's camera it is a black and white fleck about 7 pixels long. Weak points: the edge between black and white is soft where the photograph's is sharp; the face is plain close up. |

All seven pass at the distances a player sees them. None is a close-up hero model, and the
weak points above are real: a second round on the kite's bill and the raccoon's legs would
improve them.

## Numbers

| Animal | File | Clips | Triangles | GLB bytes | Map | Size L x W x H, m (Idle) | Lowest point in Idle (and Walk), mm |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| Black kite | `black-kite.glb` | Idle, Fly (1.3 s glide) | 1,950 | 466,040 | 512 | 0.51 x 0.20 x 0.34, span 1.5 | -1.2 |
| Little egret | `little-egret.glb` | Idle, Fly (0.7 s) | 1,948 | 451,668 | 512 | 0.48 x 0.13 x 0.60, span 0.98 | -2.8 |
| Black-faced spoonbill | `black-faced-spoonbill.glb` | Idle, Fly (0.7 s) | 1,950 | 440,136 | 512 | 0.63 x 0.18 x 0.63, span 1.12 | -3.9 |
| Pigeon | `pigeon.glb` | Idle, Fly (0.3 s) | 1,950 | 443,012 | 512 | 0.27 x 0.12 x 0.20, span 0.66 | -0.6 |
| Owl | `owl.glb` | Idle, Fly (0.7 s) | 1,920 | 489,476 | 512 | 0.19 x 0.15 x 0.32, span 0.94 | 0.5 |
| Raccoon | `raccoon.glb` | Idle, Walk (1.6 s) | 3,468 | 1,062,212 | 1024 | 0.77 x 0.25 x 0.33 with the tail | -1.7 (-0.2) |
| Street cat | `street-cat.glb` | Idle, Walk, and the wolf donor's 10 others | 4,100 | 1,784,032 | 1024 | 0.52 x 0.14 x 0.32 with the tail | 0.0 (-0.6) |

All are in metres with the feet at the origin and the nose along +X. The cat's donor clips
keep their donor names (`Eating`, `Gallop`, `Idle_2` and so on; each also under
`AnimalArmature|...`). The birds stand on the ground in Idle, as the turkey vulture does.

## Photographs (reference only, never in the game)

Wikimedia Commons, public domain or CC0, listed in `tools/blender/wildlife/city-references.json`:
black kite perched, birdsaspoetry.com (CC0), and in flight, Hobbyfotowiki (CC0); little egret
standing, Hobbyfotowiki (CC0), and in flight, Joselodos (CC0); black-faced spoonbill,
Probophilic (public domain); pigeon standing, Drcbrothephotographer (CC0), and in flight,
Fernando Prada Sanroman (public domain); barn owl standing, StoppedTime (CC0), and in flight,
Dannymoore1973 (CC0); raccoon, John and Karen Hollingsworth for USFWS (public domain), and its
face, ImagePerson (CC0); street cat, Rudolph.A.Furtado (CC0).
