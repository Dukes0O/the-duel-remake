# TOWN-ART-SAFETY — Guard post, round 7

## Self-review

- Likeness: **3/4.** The hut is compact at 6 m by 4 m, with a waist-high sandbag perimeter and a clear road-side doorway. Its patched two-slope roof and timber supports read from above and from the road. The carved wall sections meet with visible seams at the corners.
- Materials: **4/4.** Sandbags use their wall photos, the roof uses the straight-down patched tin photo, the frame uses weathered timber, and the brazier uses its own rusted bowl photo.
- Framing: **4/4.** Four matched photo/model views, two three-quarter views and the mayor view show the exported guard post.
- Scope: **guard-post only.** Other safety buildings are hidden in the round sheet.

## Exported bounds

Bounds are metres in game axes (X, Y up, Z); every individual mesh bound is printed by `town-safety.py` after GLB readback.

| Piece | Min | Max |
| --- | --- | --- |
| Sandbag walls, including the split doorway wall | (-2.977, 0.052, -1.965) | (2.972, 1.287, 1.986) |
| Timber posts and roof frame | (-3.000, 0.050, -2.031) | (3.000, 3.445, 2.031) |
| Pitched tin roof and eaves | (-3.300, 2.315, -2.322) | (3.300, 3.455, 2.322) |
| Brazier and feet | (-0.610, 0.040, 0.110) | (0.610, 1.080, 1.330) |

The wall run measures about 6 m by 4 m. The roof adds 0.3 m on each edge, for a 6.6 m by 4.6 m overall roof. That stays inside the 2 by 1 cell footprint with more than 0.5 m clearance. The model has 3,680 triangles and the GLB is 2,983,396 bytes. The review sheet is 333,379 bytes.

## Claude: please judge

Please inspect the four wall faces and the doorway from the three-quarter views; the gable and long wall against their matching photos; the eave posts and short-wall midpoint posts; the straight-down patched roof texture; and the brazier inside on the ground. The Blender readback checked per-piece bounds, ground contact and the 2 by 1 cell clearance. The original wall photos remain full resolution for carving; only the packed front/rear wall images were downsampled for the GLB budget.
