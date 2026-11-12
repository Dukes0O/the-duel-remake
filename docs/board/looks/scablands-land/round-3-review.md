# The Scablands as a place: round 3, the Everburn well, the Dead Mall and the Boneyard (12 November 2026)

Sheet: `round-3.jpg`. Facts only; the verdict is Claude's. Taken by a Sonnet helper from the game on this branch (commit
e64793b1f), in daylight, on High (composite pipeline, edge smoothing on, 2,048 shadow map), 1536 by 864, with the rear
mirror and all page furniture hidden. Columns are the places, rows are the views.

## How it was taken

- A scratch scenario (not committed) started each place's job in a QA page with `story-everburn` on (and `scablands-runs`
  for the gas run), memory-only saves, and set `__qaApp.inspectionCamera` (48 degree view) for each picture.
- Everburn well: job 6, "The Everburn", start of the defend step. The furnace stands at its rest place (-406, 2, 304) and
  the one wave actor `0-0` at (-448, 288) is not drawn. Dead Mall: job 5, "The Key Under the Mall", step 0 (no actors).
  Boneyard: the gas run on the Boneyard road, step 0. Big Bess is not at the Boneyard in that run (she starts at the well,
  (-423, 304)), so the Boneyard's close picture on the sheet is a different one: Big Bess at her resting place beside the
  north wreck, taken in job 5 where she stands there.
- The player's car was moved to the far side of the oval, (0, -400), so it is not in any picture.
- Road views: camera 1.46 m above the road line (the oval, 600 by 430 m) at 80 m and 25 m from the place's centre, on the
  side the road comes from. High view: 60 m out and 35 m up (the Boneyard is 150 by 180 m, so 110 m out and 55 m up). Close
  view: 12 m from the place's centre (the mall: 12 m from its front wall, which faces +z, away from the oval's middle).
- Dropped from the sheet: the Boneyard's own close view (12 m from (428, 300)), which looked the same as its 25 m view; the
  Big Bess close view took its place. Taken but kept off the sheet (not kept as files): each place from 320 m (to see the
  far silhouette), the Boneyard straight down from 230 m, and the mall's inside from 9 m up.

## What the sheet shows

- No model draws white, black or one flat colour: every material of the three models arrives with its own colour. Nothing
  stands on end. The wrecks' bodies lie on the ground (lowest points 0.95 to 1.0 m, ground 1.02 m), the mall stands on its
  own raised pad, the derrick stands on its wellhead.
- The three places read as different kinds of object: a lone derrick with a flame, a flat-roofed pale box with a stall
  interior, three identical aircraft wrecks in a row.
- The ground is the dark packed ribbon with two darker ruts, sand beside it, and cliffs behind. At 25 m and 12 m the
  surfaces carry rust and streaks; at 80 m the places are small and alone on a wide empty strip.

## Faults by place (worst first), with names and positions

Positions are world metres (x, y, z); z grows toward the south.

### The Everburn well (`The Everburn detail LOD` at (-424, 2, 304); model `everburn.glb`, 17 meshes, 13,044 triangles)

1. **Smoke pillar of seven grey balls.** Group `Everburn smoke pillar visible across the Scablands` (made in
   `src/world/scablands-scene.js`, `mastAndSmoke`): seven low-poly spheres at x -424 or -421, z 304, heights 18, 30, 42, 54,
   66, 78 and 90 m, radii 4.8 to 12.3 m, colour 0x433a32 at 36 percent opacity. In every picture of the well, and in the mall
   and Boneyard pictures, they read as floating balls stacked like a snowman, not smoke.
2. **The flame is one hard-faceted orange solid.** `everburn-flame-core`, `everburn-flame-outer` and the merged
   `everburn-burning-flame-orange` and `-yellow` meshes, y 10.4 to 14.6 at (-424, ., 304): an opaque glowing cone with flat
   faces, a carrot shape from the air. The gate's fire and the furnace's fire are drawn in code and look different.
3. **Emptiness.** The place's flat circle is 78 m wide. It holds one derrick (8 by 12 m, 11 m tall without the flame), a
   gravel apron (`everburn-merged-shared-everburn-charred-gravel`, 8 by 6 m, 0.2 m high), scattered orange plates and
   ember dots, and the furnace parked 18 m east. No hut, tank, pipe, tent or wreckage.
4. **Far from 280 m the well becomes a plain box.** `The Everburn far silhouette`, a 32 by 12 by 24 m tan box of one colour
   (0x4c4236) at (-424, 6, 304), is all that shows past 280 m, with the 90 m ball stack standing over it.
5. **Ground at the 80 m view.** The road ribbon lies under the drawn ground in places: 73 of 427 ribbon quads within
   100 m of the well (17 percent), by up to 1.12 m. In the 80 m picture it shows as a pale cracked patch with hard straight
   edges across the lower half, camera spot (-356, 3.2, 346). The ridge behind the well (left of the 80 m picture) shows saw-teeth along
   its face from the 23 by 17 m ground cells.
6. **Collision wider than the picture.** `everburn-well` solid is 18 by 18 m, 9 m tall, centred (-424, 2, 304); the visible
   foot of the derrick and apron is 8 by 6 m, so a car stops 5 m short of anything it can see.

Not wrong: the derrick and its wheel stand on the wellhead (parts from y 2.47, ground 2.03); three body meshes reach y -1.45
(3.5 m under the ground) and are hidden.

### The Dead Mall (`The Dead Mall detail LOD` at (0, -1, 430); model `mall.glb`, 254 meshes, 18,620 triangles)

1. **Sign lettering is off its boards.** Meshes `invented-sign-lettering-0`, `-1` and `-2` (made in
   `tools/blender/` mall recipe, line `invented-sign-lettering-{i}`) stand about 6 m to one side of the boards
   `shop-sign-tin-&-thread` (x 6.9 to 13.1), `shop-sign-last-light` (-1.1 to 5.1) and `shop-sign-dry-goods` (-10.1 to -3.9),
   all at z 435.2 to 435.5, y 4.1 to 4.7. `-0` spans x 12.8 to 18.8, which is 3.9 m past the east wall (x 14.9): the word THREAD
   hangs in the air beside the wall and reads backwards from the road (25 m picture). In the close picture "DRY GOODS" runs over
   its neighbour's board. `-3` and `-4` (z 424.5) sit on their boards correctly.
2. **Nine plain rocks round the mall.** Group `Dead Mall sand drifts and rubble` (`addMallRubble`): nine 12-sided solids
   (pale `sand` 0x8a6e4e and dark `stone` 0x55483a, one flat colour each, no wear), 4 to 6 m wide, hard-edged, at ring
   radius 30 to 38 m: (30, 430), (26, 452), (7, 467), (-15, 456), (-32, 442), (-36, 417), (-15, 404), (6, 397), (29, 406), each
   1 m above the ground at its point. They read as toy boulders, brighter than the ground around them.
3. **From the road the mall is a blank pale wall.** At 80 m and 25 m the road side (east wall, x 14.1 to 14.9) is
   one cream surface with vertical rust streaks; nothing says mall. The entrance (gap in `half-buried-mall-front-wall-` and
   `-11`, x -7.5 to 7.5, z 440.1 to 440.9) faces +z, away from the road line.
4. **The model is 254 separate meshes**, 635 to 769 draw calls with the mall in view (see the numbers), about three times any
   other view.
5. **Far from 280 m the mall becomes a plain box.** `The Dead Mall far silhouette`, 32 by 12 by 24 m, tan, at (0, 5, 430). It
   shows as a box with a dark side at 320 m.
6. **The road crosses the mall's ground:** 28 of 372 ribbon quads within 100 m lie under the ground, by up to 2.35 m; in the
   80 m picture the lower right shows a hard straight edge between dark road and pale sand.
7. **Collision wider than the picture.** `dead-mall-shell` is 38 by 35 m, 13 m tall, centred (0, -1, 430); the model's walls
   are 30 by 22 m (x -15 to 15, z 419 to 441): an invisible wall 4 m beyond the east and west walls and 6.5 m beyond front
   and back.
8. **Sand drifts** (`sand-drift-1` to `-4`, around x 7 to 15, z 425 to 440, y up to 0.4) read as beige cushions at the
   entrance (close picture).
9. Not seen in any picture though in the model: the four props `ash-men-lamp-1` to `-4` (posts from y 1.7, fuel cans from
   y 0.92 at (13, 438), (-13, 422), (5, 429) and (-7, 431); the floor tiles top out at y -0.45). The mall's lamps view showed
   none of them; they may be job props that are hidden until needed.

The inside, from the close picture and from above, is a good read: rusted stall frames, green shop signs, tile floor, roof
trusses, a red job ring.

### The Boneyard (`The Boneyard detail LOD` at (424, 1, 304); model `boneyard.glb`, 54 meshes, 30,349 triangles; Big Bess's rig has 46 more)

1. **The dirt slab shows as hard-edged brown pieces.** Mesh `Boneyard_ground_—_Dry_Scablands_dirt`: one flat plane of 24
   vertices at y 0.68 to 1.0 over x 349 to 499, z 214 to 394, laid over ground that runs from -1.2 to 109 m. Of its 24
   vertices 12 lie above the ground (up to 2.24 m) and 6 are buried (up to 108 m). From above (the 110 m picture and a
   straight-down picture) it shows as rust-brown rectangles and thin slivers with straight cut edges along the field's
   north edge and south-west corner, and a ragged brown polygon on the east side, over the sand and across the ribbon.
2. **Big Bess's resting place is inside the north wreck.** Her rig `Big Bess moving rig` rests at (442, 1, 304), facing +x;
   the north wreck's fuselage (`North_Wreck_fuselage_*`) runs x 406 to 441, z 301 to 307, so about 4 m of her tank overlaps its
   tail (close picture of Big Bess). In the gas run she starts at the well, so she is not there until the road run arrives;
   the Boneyard road's fourth point (447, 308) is 2 to 3 m from the north wreck's wing tip (x 444.6).
3. **Only one of the three wrecks has collision.** `boneyard-planes` is 47 by 30 m, 11 m tall, centred (412, 1, 278): it
   covers the east wreck (x 410 to 445, z 271 to 283) and nothing of the north wreck (z 289 to 315) or the south wreck
   (z 318 to 342), which a car drives through.
4. **Emptiness and repetition.** Three copies of one aircraft in a row at (425, 1, 277), (425, 1, 304) and (421, 1, 331), a
   scattering of small plates, two flat scrap sheets (`Boneyard_field_scrap_*`, y 1.0 to 1.2 over x 378 to 475, z 246 to 366,
   not noticeable in the pictures), and nothing else on a 150 by 180 m field.
5. **The engine pods read as barrels.** `*_Wreck_landing_gear_—_Engine_pod_burnt_rubber` (three, one per wreck, at
   x 419 to 433) are plain cylinders with flat ends, lowest point y -0.99, 2 m under the ground (close pictures).
6. **Fuselages are visibly faceted tubes** at 12 m (flat facets show along the whole body).
7. **Far from 280 m the field becomes a plain box:** `The Boneyard far silhouette`, 32 by 12 by 24 m at (424, 7, 304), the same
   box as the other places, on a field 150 m wide.
8. **The ridge** behind the place is one dark brown wall with no strata in the 80 m, 25 m and close pictures, with
   saw-teeth along its top edge; ribbon under the ground: 50 of 427 quads within 100 m (12 percent), by up to 0.6 m.

### On every place

- The cliffs have no strata or drift in any of the 12 pictures and the near ground's cell edges (23 by 17 m) show as
  saw-teeth along every ridge face.
- The road ribbon has a hard edge against the sand with no blend, in the 80 m mall picture and the Boneyard high picture.
- Not seen in these views: seams or a visible repeat in the ground at foot level.

## Render numbers

From `renderer.info.render` after one drawn frame at High, with the rear mirror off and the player's car 830 m away
(the mall's close and lamps views have that car in their line of sight, about 125,000 triangles of the figure; the road
pictures of the mall look away from it). "Meshes in view" is meshes whose bounding sphere meets the view, from the scene
walk (the scene holds 2,948 meshes).

| Place and view | Draw calls | Triangles | Meshes in view |
| --- | ---: | ---: | ---: |
| Everburn, road 80 m | 264 | 162,751 | 79 |
| Everburn, road 25 m | 216 | 160,373 | 54 |
| Everburn, high | 243 | 164,931 | 68 |
| Everburn, close | 176 | 152,235 | 34 |
| Everburn, far 320 m | 230 | 136,627 | 64 |
| Dead Mall, road 80 m | 746 | 172,875 | 331 |
| Dead Mall, road 25 m | 738 | 172,587 | 327 |
| Dead Mall, high | 635 | 147,743 | 272 |
| Dead Mall, close | 769 | 299,191 | 339 |
| Dead Mall, far 320 m | 234 | 134,939 | 75 |
| Boneyard, road 80 m | 421 | 213,489 | 169 |
| Boneyard, road 25 m | 395 | 210,167 | 156 |
| Boneyard, high | 218 | 177,125 | 64 |
| Boneyard, close | 307 | 188,129 | 110 |
| Boneyard, far 320 m | 172 | 167,607 | 41 |
| Big Bess at the Boneyard, road 25 m | 236 | 186,151 | 73 |
| Big Bess at the Boneyard, close | 269 | 174,155 | 89 |

Parts of the place models in the scene (no frame check was run): the well 17 meshes (13,044 triangles, plus the furnace's
41 meshes beside it), the mall 254 meshes (18,620), the Boneyard 54 meshes (30,349, plus Big Bess's 46).

Verdict (Claude): to be written.
