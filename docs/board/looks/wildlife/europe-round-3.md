# Europe, round 3 of 3 (final)

Claude's round 2 verdict is at the top of `europe-round-2.md`. Sheet:
`europe-round-3.jpg` (170,540 bytes), the three candidates only, same
columns. They are still built under the ignored `.qa-dist/wildlife-candidates/`;
whatever Claude passes moves into `public/assets/wildlife/` and the model
table, with its export checks restored.

## What changed

| Animal | Change |
| --- | --- |
| Wild boar | Legs rebuilt: a thick, deep forearm or ham rises out of the body from a dome deep inside the flank (no tube seam or flat end), tapers to a defined knee or hock about 0.2 m up, then a slim dark shank on the small cloven hooves with dewclaws. Front legs set further under the shoulders. Body, head and coat unchanged. |
| Wildcat | Legs rebuilt the same way: thick upper legs blended into the body from inside, a closed rounded elbow and hock, a slimmer lower leg and a round paw. Body smoother (lower outline noise) and deeper in the chest; the tail's root sits wide inside the rump; head a little rounder with the ears set wider. Coat and tail unchanged. |
| Golden eagle | Smaller head (6.4 cm radius) built from more rings and sides; the nape ball sits lower and wider so the head grows out of the shoulders. Forehead, face and throat dark brown; golden-buff only on the back of the crown and the nape, streaked into the brown. The bill is yellow only at the base; the outer hooked part is dark. Wings and feet unchanged (five primaries, to stay within 2,000 triangles). |

`bird.py` gains optional `head_detail` and `nape` settings; their defaults
give the passed kookaburra its same head.

## Numbers

| Animal | Triangles | GLB bytes | Size L x W x H, m (Idle) | Lowest Idle / motion, mm |
| --- | ---: | ---: | --- | --- |
| Wild boar | 3,722 | 899,140 | 1.78 x 0.60 x 1.01 | -6.0 / 0.0 |
| Wildcat | 4,876 | 1,202,464 | 0.89 x 0.21 x 0.42 | -2.6 / -0.1 |
| Golden eagle | 1,968 | 408,892 | 0.65 x 0.24 x 0.53 | -84.1 / -92.8 (Fly) |

## My judgement, for Claude's final call

- **Wild boar: pass.** The legs now read as short, solid boar legs with the
  forearm and ham blended into the body; it looks right close and far.
- **Golden eagle: pass, narrowly.** Dark face and throat, gold confined to
  the crown and nape, clear dark hook. The head still shows as a head on a
  slightly separate nape from the rear three-quarter view.
- **Wildcat: not a pass.** The coat and tail read well, but the legs still
  look like sleeves with visible joints and the body is blocky in the close
  view. At race distance it reads as a tabby cat; up close it is below the
  bar of the passed animals.
