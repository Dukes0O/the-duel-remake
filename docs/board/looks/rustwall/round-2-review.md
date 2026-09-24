# Rustwall round 2: Director review

Assets: `522c39d`. Browser observation: `a4854e6`. Reviewed the full contact
sheet, matched depth views and the actual High wash. The corrected captures
show the isolated rock in both qualities and retain valid course views.
The original round 1 failure remains documented.

| Item | Resemblance | Readability | Grounding | Scene fit | Frame cost |
| --- | --- | --- | --- | --- | --- |
| Wall, gate and salvage detail | 3 | 3 | 4 | 3 | 3, pending final comparison |
| Wash rock scenery | 2 | 3 | 3 | 3 | 3, pending final comparison |

The wall's directional wear, uneven wreck piles and torn banners improve
its resemblance. The wash now has coherent strata instead of mismatched
face patches. Repeated column shapes and broad, soft texture bands remain
prominent in the actual driving view. Neither family reaches beta.

## Five changes for round 3

1. Add stronger asymmetric erosion and staggered ledges to the rock's two
   sides. Use the approved deterministic half-turn variation to expose both
   profiles along each bank. Keep the same positions, collision envelope,
   single prototype, instance count and simulation state.
2. Give the continuous strata finer natural cracks and grain. Avoid both
   round 1's checker-like patches and the current smooth airbrushed bands.
3. Break up the wall's large rectangular steel fields with restrained
   overlapping or torn edges and more convincing wear around those edges.
4. Strengthen gate machinery, cables and supports, plus a small amount of
   grounded salvage near the entrance. Preserve the measured 9 by 7 m opening.
5. Improve banner folds and frayed outlines, and make the local fire/guard
   silhouettes clearer without enlarging the human figures.

## Cost and limits

The wall is now 51,020 triangles and 13 material draws; the wash remains
144 triangles per bank and one instanced draw. Ordered timing and draw/triangle
samples are retained rather than treating the last shadow-refresh frame as
a constant draw budget.

High wash CPU p95 rises from 2.5 to 2.8 ms, about 12%, while its median rises
from 2.1 to 2.3 ms and RAF p95 stays 18.1 ms. The other CPU p95 pairs are
2.6/2.6 ms for High approach, 1.9/2.0 ms for Performance wash, and 1.7/1.7 ms
for Performance approach. Do not flatten this mixed result into a blanket
performance pass. The planned third-round comparison will assess it again;
no extra parameter grid or duplicate full scenario is requested.

The measurement still isolates model visibility on the same widened ground.
CPU submission is not GPU time, and these stopped-course samples do not
establish worst-case race performance. Preserve that scope in the final note.
