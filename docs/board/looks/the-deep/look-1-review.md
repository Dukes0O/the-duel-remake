# The Deep, look test 1 (D0 DEEP-LOOK)

[The sheet](look-1.jpg) holds six fixed views at 1280 x 720 on High quality,
joined into one JPG (about 370 KB). One car, the Falcone F42, sits on the sand
in every view for scale and for the headlights. Nothing here is reachable in the
game: the page is `tools/deep-look.html`, behind the `the-deep` switch (off), and
the pictures come from `node tools/browser-harness.mjs scenario deep-look` on a
private port with no saves. Three rounds were spent on the sheet, the most
SPEC 0.11 allows.

## What is on the sheet

| View | What it shows |
| --- | --- |
| 1 Shallows in sun | 4 m deep, looking toward the sun: the bright window in the surface, the sun as a soft disc, shafts of light, rippled sand with caustics, warm sand and a red car |
| 2 Inside the kelp forest | 7 m deep among tall kelp: swaying stems, light through the blades, kelp shadows on the sand, a light shaft fan |
| 3 Up through the kelp | 11 m deep, looking up: the surface seen from below with the sun, the silver mirror outside the window, kelp silhouettes and shafts |
| 4 Fish school parts around the car | 480 small silver fish; the cloud opens around the car and closes behind it |
| 5 Deep, 28 m, headlights | blue water, no caustics, the car almost black (its red is gone), headlight pool on the sand and a faint beam |
| 6 Low chase view | the game's chase camera (8.7 m back, 3.65 m up, 55 degree view) over seagrass sand at 2 m |

## Against section 9 "Never"

- **Cartoon fish:** no. Fish are 30 cm, silver flanks, dark backs, white bellies,
  a forked tail, no eyes drawn, no colours. They flash as the school turns.
- **Neon colours:** none. The one place colour ran hot was the light shafts on
  Performance, which a first pass drew neon cyan; they were pulled back (see the
  last point under "did not get right").
- **A flat blue tint:** no. Sand and the car stay warm in the shallows (view 1,
  6), blue-green at 7 to 11 m, blue at 28 m (view 5), where red is gone.
- **A hard fog wall:** no. Fog is soft and per colour (red fades first), and it
  ends in the same colour as the open water behind it, so the far sand melts
  away. The floor keeps falling past the end of the stretch so it never stops at
  an edge.

## What the sheet got right

The surface seen from below (view 3 is the strongest picture), caustics on the
sand that shrink and fade with depth, kelp that glows when you look toward the
sun through it, the colour change from sand-and-red to blue, and a school that
reads as one animal. Fog, shadows and caustics all come from the same few
numbers in `src/deep/depth-colour.js`.

## What it did not get right (for D4 to fix)

- Kelp blades up close are still a little stiff and geometric (view 2, right).
  They need more blades, softer shape and more golden-brown variety.
- Seagrass tufts are sparse and slightly spiky; the meadows should be denser.
- The rocks are smooth lumps. Real rocks need cracks, barnacles and growth.
- Caustics on the car body are faint (the clear paint reflects more than it
  scatters). They read on the sand, not on the car.
- The headlight beam is a plain soft cone; it should show dust catching the
  light, and the pool on the sand is a little white.
- The edge of the bright window in the surface is sharp. That is real physics,
  but wide waves could soften it more.
- Performance quality (looked at separately, not on the sheet) is the same scene
  with about 70% of the kelp, fish and seagrass, no glow around the sun, and
  light shafts that run a little bluer than on High because they are drawn
  straight to the screen. It still reads as the same place.

## Frame times (delivered, this laptop's NVIDIA RTX A1000)

Delivered frame time is measured between screen refreshes over 300 frames with
the clock running (kelp swaying, caustics moving, school swimming), at all six
views, High and Performance, at pixel ratio 1.0 and at the game's High cap of
1.6. The screen is locked to 60 Hz, so a delivered p95 of 16.8 ms means no
missed frames.

| Quality | Pixel ratio | Delivered p95 (all views) | Worst single frame | GPU time p95 |
| --- | --- | --- | --- | --- |
| High | 1.0 | 16.8 ms | 17.1 ms | 9.0 to 12.7 ms |
| High | 1.6 | 16.8 ms | 17.0 ms | 12.3 to 16.2 ms |
| Performance | 1.0 (it never goes above 1.0) | 16.8 ms | 16.9 ms | 4.7 to 10.4 ms |

Everything is at or under the 18.5 ms target. The headroom is thin on High at
1.6: the GPU is busy 12 to 16 ms of every 16.7 ms in the kelp views (one earlier
run of the same code also saw a single 33 ms frame in view 6). Draw calls stay at
about 150 and triangles are 0.7 to 1.3 million on High (0.3 to 0.5 million on
Performance), so D4 has to hold the line rather than add to it.

Construction of the whole stretch (every mesh, the car and the reflection map)
took 0.92 s, just inside the plan's 1 s. The first frame took 3.5 s because
every shader compiles then; the real zone needs the game's warm-up so a driver
never sees that pause.
