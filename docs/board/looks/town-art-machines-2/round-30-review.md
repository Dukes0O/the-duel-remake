# TOWN-ART-MACHINES-2 — round 30: loader

Fifth loader round. The loader's front frame and working assembly now follow
the photo carve toward Blender +Y. The bucket rests at ground level ahead of
the front tyres; the work pose raises the arms and tips the bucket forward.
The other four passed machines are unchanged.

## Export bounds

Read back from the exported GLB in Blender, at rest:

| Part | Blender bounds (min to max) | Check |
| --- | --- | --- |
| `loader:arms` | `(-1.300, 0.710, -0.001)` to `(1.300, 3.943, 1.631)` | min Y > 0: pass |
| `loader:bucket` | `(-1.300, 2.995, -0.001)` to `(1.300, 3.943, 0.999)` | min Y > 0 and > 2.6: pass |

The bucket's low Z bound is within 1 mm of the ground plane. The output check
confirmed every machine is within 15,000 triangles.

## Scores

| Measure | Score | Finding |
| --- | ---: | --- |
| Resemblance | 2/5 | The loader faces the right way and its bucket reads at the front. The photo-carved cab and body retain streaked projection seams. |
| Readability | 4/5 | Paired yellow arms connect the frame pins to the bucket; the work pose raises and tips them. |
| Grounding | 4/5 | Tyres remain grounded and the bucket rests at z≈0. |
| Scene consistency | 4/5 | Both exported joint bounds are in front of the origin; the bucket clears y=2.6. |
| Frame cost | 4/5 | `test-blender-output.mjs`: 389 checks, 0 failures; machine triangle caps pass. |

## Biggest differences for Claude to review

1. Confirm the arms rise and the bucket tips forward in the work pose.
2. Confirm the bucket sits on the ground beyond the front tyres at rest.
3. Check the front and rear exports against the photos and look for the
   existing projection seams.
4. Confirm the four passed machines remain unchanged.
