# TOWN-ART-SERVICES — Round 3 review

## Source and method

The family GLB was rebuilt from `tools/blender/town-services.py` and imported
again for the exported-model views. The Town Hall body now uses the four
existing measured photos through `carve_object`; the trace/slab photo overlays
were removed from the scrapyard, and the workshop's flat roof-photo plate was
removed. Hall carve target: 3,000 triangles at 0.09 m voxel size. The GLB is
2,521,920 bytes. The sheet is 406,607 bytes.

## Builder review

| Measure | Score (1–5) | Note |
| --- | ---: | --- |
| Reference resemblance | 2 | Hall has depth, but its carved mass does not preserve the porch/front photo. Other building blockouts remain generic. |
| Proportions | 3 | Named plots remain in the exported family; visual framing is clear for the four highlighted buildings. |
| Materials | 3 | Existing worn photo materials remain legible, but the generic roofs read as flat grey panels. |
| Color | 3 | Brick, rust and wood are distinct; several blockouts remain uniform. |
| Detail | 2 | The Scrapyard gantry is not readable enough and the car stacks are not carved. |
| Wear | 3 | Existing four reference buildings retain their prior wear. |
| Readability at town zoom | 2 | The four main silhouettes read, but the Scrapyard frame and simpler buildings need work. |
| Grounding | 2 | Some blockout elements, including the helipad H, appear detached in the views. |
| Scene consistency | 2 | Main four retain a shared look; other buildings are unfinished blockouts. |
| Frame cost | Not measured | Art-only model; not wired into a reachable scene. |

## Verdict and next pass

**Not ready to pass.** Round 3 removes the two scrapyard slabs and the workshop
roof-photo slab, and changes the Town Hall to a multi-view carve. The forge's
roof still reads as a grey plate. The Scrapyard gantry and car stacks still
need real depth. The Town Hall's carve needs a matching three-quarter check
and a better fit to its front reference. Workshop and forge still need their
side, rear and overhead photo sets and `carve_object` tables. The remaining
buildings are not yet built to their individual photo sets. Round 4 should
continue in the requested order, starting with the Hall/forge/workshop depth
and Scrapyard lattice, then motor-pool, helipad and the rest.

Claude should inspect the exported Hall front and roof, Forge roof, Scrapyard
road and mayor views, Workshop roof and open bay, and every building in the
three-quarter grid at the bottom of the sheet.
