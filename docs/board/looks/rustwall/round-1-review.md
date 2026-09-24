# Rustwall round 1: Director review

Assets: `bb31758`. Browser observation: `6d16f8e`. Reviewed the complete
contact sheet and full-size game depth, full-span and course-wash images,
with the generated Rustwall reference and the matched Blender views.

The measured dimensions and opening are correct. The wall is fully grounded
across its span. Its initial appearance needs substantial refinement.

| Item | Resemblance | Readability | Grounding | Scene fit | Frame cost |
| --- | --- | --- | --- | --- | --- |
| Wall, gate and salvage detail | 2 | 3 | 4 | 2 | 4, limited scope |
| Wash rock scenery | 1 | 3 | 3 | 2 | 4, limited scope |

Readability is judged from the recorded approach views, not a continuous
driving test. The reference has no wash close-up; that score judges whether
the scenery reads as the specified natural dry wash, not a pixel match.
The isolated Performance wash capture is blank. The original image remains
as evidence of a capture failure. Actual course views show the rock scenery;
the fixture must be corrected before round 2. Do not infer a missing runtime
asset solely from that isolated image.

## Five changes for round 2

1. Replace the wash's repeated rectangular columns and checker-like face
   patches with eroded, irregular rock shapes and coherent strata. Keep the
   existing collision envelope and ground contact. Repetition is conspicuous
   along both banks at driving distance.
2. Replace uniform speckled steel with directional rust runs, darker seams,
   edge wear and varied larger areas of paint. The game currently reads as
   alternating flat colored rectangles with bright frame lines.
3. Make the car hulks read as compressed salvage stacks. Their equal spacing,
   flat platforms and identical alignment resemble display shelves. Preserve
   the recognizable vehicle silhouettes while varying compression and pose.
4. Give the banners torn hems and cloth depth, and strengthen the gate's
   machinery and framing. The reference's layered gate structure is much
   richer than the narrow plain frame above the small movable panel.
5. Add a restrained amount of grounded base debris and strengthen the small
   fire/guard silhouettes. Preserve the 9 by 7 m passage and human scale;
   do not enlarge people or the opening to mimic the reference's lower wall.

## Cost and limits

Wall: 57,632 triangles and 13 material draws. The rock prototype has 144
triangles; 179 banks require 25,776 triangles and one instanced draw.
The wider prepared-ground patch adds 832 triangles, from 9,824 to 10,656.

The four 120-frame comparisons have RAF p95 changes from 18.2 to 18.2 ms
(both High views), 18.3 to 18.2 ms (Performance wash), and 18.3 to 18.1 ms
(Performance approach). The largest positive CPU p95 change is about 5.3%.
Ordered raw RAF and CPU samples are retained. This supports the ten-percent
limit within these stopped-course views on this machine.

The baseline is greybox scenery on the widened ground. It isolates model
cost; it is not a whole-scene comparison with the previous commit. CPU
submission is not GPU time, and final-frame draw counts can vary with shadow
updates. No beta or complete performance claim follows from this round.
