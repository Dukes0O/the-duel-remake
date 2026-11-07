# TOWN-ART-SAFETY | Round 3

**Focus:** repair the review cameras, refine the safety buildings from generated photos and show joined fence and wall runs. The sheet uses the safety GLB re-imported into an empty Blender scene.

## Self-review

- Framing: **4/4.** The recipe prints each exported building's min, max and size. Every size is nonzero. The mayor view shows the roof from above; the driver view shows the front at road height. The floor is hidden in the driver views so it does not hide the lower building parts.
- Likeness: **3/4.** The main silhouettes and photo surfaces read as the references. The tower's legs, ladder, lookout, chair, lamp and roof are visible. The fire station has two open bays, faded red scrap, a hose tower and bell. The clinic has dirty white tin, a roof cross and a water tank. The guard post has separate sandbags, tin roof and brazier. The gate uses car-door panels and has a visible open pose.
- Materials: **3/4.** The four building facades use traced photo surfaces over modeled depth and openings. The watchtower keeps the existing rough timber, corrugated roof and rust materials; it could use more of the photo's surface detail.
- Family: **3/4.** All IDs remain in the family. The joined-run row shows one run for each fence and wall tier. Claude should check the scale and the gate swing before accepting the look.

## Generated references

Generated with the built-in image tool for this round. The JPEG inputs are in `public/assets/models/wasteland/town/textures/` and are embedded by the GLB photo materials.

- `town-safety-watchtower.jpg`: documentary photo of an original timber and steel lookout tower, with open cross-bracing, patched tin lookout walls and roof, chair and lantern; dusty ground, no text or people. This is the prior watchtower reference, retained as the source.
- `town-safety-fire-station.jpg`: dead-on view of a faded red scrap fire station with exactly two open vehicle bays, a hose-drying tower, hanging hoses and bell.
- `town-safety-clinic.jpg`: near-front view of stained white corrugated tin, a large raised red roof cross and a water tank.
- `town-safety-guard-post.jpg`: dead-on view of individually visible fabric sandbags, tin roof and brazier.
- `town-safety-gate.jpg`: dead-on road gate built from salvaged car doors and sheet steel, shown shut in the photo.

## Exported bounds

Bounds are in the re-imported Blender scene, in metres. Each box was checked for zero size.

| Building | Min | Max | Size |
| --- | --- | --- | --- |
| watchtower | (-1.000, -1.146, -0.004) | (1.000, 0.967, 7.065) | (2.000, 2.113, 7.069) |
| fire-station | (-11.600, -12.100, -0.024) | (11.600, 12.100, 13.380) | (23.200, 24.200, 13.404) |
| clinic | (-6.750, -6.630, 0.000) | (6.750, 6.720, 6.850) | (13.500, 13.350, 6.850) |
| guard-post | (-6.320, -3.152, 0.000) | (6.610, 3.152, 3.445) | (12.930, 6.304, 3.445) |
| gate-scrap | (-7.450, 2.990, 0.000) | (7.450, 3.580, 5.660) | (14.900, 0.590, 5.660) |
| searchlight | (-0.480, -0.360, 0.000) | (0.480, 0.920, 5.210) | (0.960, 1.280, 5.210) |
| hydrant | (-0.302, -0.460, 0.000) | (0.525, 0.302, 1.425) | (0.827, 0.762, 1.425) |

The four joined runs are each 24.1 m long and have nonzero height. Their bounds are printed by the recipe.

## Claude: please judge

Inspect `round-3.jpg`, especially the building fronts and roofs, the open and shut gate, the watchtower's chair and lamp, and the cell-edge joins. The driver views remove the ground plane so the complete exported shape stays visible.
