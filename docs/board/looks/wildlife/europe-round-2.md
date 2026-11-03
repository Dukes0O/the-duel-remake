# Europe, round 2 of 3

## Claude's round 2 verdict

All three read right at race distance, but the close views still show
faults. Round 3 is the last (SPEC 0.11); after it each passes or is dropped.

1. Wild boar: the legs went from stumps to sticks. Short but solid legs: a
   thick muscular forearm and ham blended into the body with no tube seam,
   tapering to a slim lower leg and the small cloven hooves. Front legs set
   under the heavy shoulders. Keep body, head and coat.
2. Wildcat: keep the coat and tail. Thick upper legs blended into the body,
   a defined elbow and hock, round paws; a smoother body, a little deeper in
   the chest, no faceted planes; the tail joining the rump smoothly; the
   head a touch rounder with the ears set wider.
3. Golden eagle: a smaller, smoother head; forehead, face and throat dark
   brown; golden-buff only on the back of the crown and the nape, streaked
   into the brown; the bill's dark hook clear; no flat planes on the head.
   Keep wings and feet.

The round 2 sheet was recycled with the round 3 commit.

Claude's round 1 verdict is at the top of `europe-round-1.md`. Passed and
unchanged: roe deer, red deer, red fox, chamois, ibex, alpine marmot, black
stork, gull; those eight are now in the game's model table.

Sheet: `europe-round-2.jpg` (169,237 bytes), the three candidates only, same
columns: 14 m, 55 mm side and three-quarter at Idle frame 1, then close Idle
and Walk or Fly. The candidates are built with `--candidate` into the
ignored `.qa-dist/wildlife-candidates/`, not `public/assets/wildlife/`, so the
model table and the runtime folder agree until they pass.

## What changed

| Animal | Change |
| --- | --- |
| Wild boar | New legs: a slim upper leg, a thin dark shank, two pointed hoof halves with a cleft, and a small dewclaw set high behind each foot; dark lower legs. The wedge snout is 5 cm longer, paler towards the disc. The coat is patchier (two sizes of darker zones), with more pale bristle tips, a darker spine ridge and a darker face. |
| Wildcat | Rebuilt as an original cat on the shared quadruped rig, no longer a reshaped wolf: compact, level-backed body, shorter muscular legs on round paws, a broad round head with a short muzzle, amber eyes, small rounded ears set wide, and a short, even, thick tail with four black rings and a blunt black tip. Clear tabby: wavy dark stripes across the flanks, bars on the legs, lines on the crown and cheeks, a dark spine line, paler belly, pale muzzle and chin. The body is built from close-spaced rings so the stripes show (coats are painted per vertex). |
| Golden eagle | Head rebuilt with the kookaburra's merged head (a head ball sunk into a broad nape ball, no fold), larger and sitting lower on the shoulders. Golden-buff crown and nape feathers flow down the back of the neck into the dark body, the face stays dark, a dark brow ridge juts over each eye, and the hooked bill is heavier, yellow at the base and dark at the tip. Wings, tail and feet kept. |

Original recipes now set their lowest rest-pose point on the ground when it
stands above it (rounded hooves and paws stood the boar 15 mm and the cat
7 mm up). Recipes already touching the ground are unchanged.

## Numbers

| Animal | Triangles | GLB bytes | Size L x W x H, m (Idle) | Lowest Idle / motion, mm |
| --- | ---: | ---: | --- | --- |
| Wild boar | 3,098 | 862,108 | 1.78 x 0.60 x 1.01 | -6.1 / -0.5 |
| Wildcat | 3,892 | 1,180,636 | 0.89 x 0.22 x 0.41 | -2.6 / 0.0 |
| Golden eagle | 1,992 | 412,824 | 0.66 x 0.24 x 0.53 | -84.1 / -90.0 (Fly) |

The eagle's Idle low is its tail below the perch.

## Unsure, for Claude

- **Wildcat**: the stripes and rings read clearly now, but the legs are
  plain tubes with a visible joint at the knee, and the tail joins the rump
  with a slight step.
- **Wild boar**: the thigh tops still show as rounded tubes where they meet
  the body.
- **Golden eagle**: the head is round and merged, but the gold reaches over
  most of the head ball; real eagles keep a darker face and forehead.
