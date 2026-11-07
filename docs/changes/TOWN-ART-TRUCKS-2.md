# TOWN-ART-TRUCKS-2 — round 3

## What changed

- Rebuilt the dozer body and the three vans through `photo_carve.carve_object` tables.
- Measured the truck extents, centre lines, ground rows, wheel centres and lamp centres on `photo_grid.py` overlays. The truck tables record those pixel values and the derived metre dimensions.
- Set the Vane truck and escort reference photos on dark grey backgrounds, then cropped their four orthographic views from the generated contact sheets. The truck top views use `along: 'x'`.
- Used `tyre`, `wheel_well` and `headlamp` for truck wheels and front lamps. Thickened the dozer arms and rams, and parented them to `dozer:blade` so they move with it.
- Exported `public/assets/models/wasteland/town/trucks-2.glb` (2,039,808 bytes). The output readback confirms the family and each vehicle meet their triangle limits.

## Measured tables

| Truck | Size (L × W × H, m) | Side: start–end, ground | Front: centre, ground, roof | Rear: centre, ground, roof | Overhead: front–rear, centre, direction | Wheel centres (side px), radius px |
| --- | ---: | --- | --- | --- | --- | --- |
| Dozer | 5.8 × 2.8 × 3.25 | 15–750, 378 | 318, 470, 14 | 304, 490, 30 | 43–741, 220, across image X | 286, 574; 82 |
| Ambulance | 5.2 × 2.2 × 2.45 | 38–884, 477 | 304, 480, 82 | 354, 480, 80 | 35–785, 267, along image X | 165, 680; 73 |
| Vane truck | 6.2 × 3.2 × 4.3 | 20–609, 490 | 312, 519, 105 | 312, 519, 105 | 9–595, 312, along image X | 116, 472; 49 |
| Vane escort | 5.1 × 2.5 × 2.85 | 22–610, 486 | 312, 519, 190 | 312, 519, 190 | 5–615, 312, along image X | 129, 491; 57 |

## Visual scores

| Truck | Side | Front | Overhead | Grounding | Materials |
| --- | ---: | ---: | ---: | ---: | ---: |
| Dozer | 3 | 2 | 2 | 3 | 3 |
| Ambulance | 3 | 2 | 2 | 2 | 3 |
| Vane truck | 3 | 2 | 3 | 3 | 2 |
| Vane escort | 3 | 2 | 3 | 3 | 2 |

The side views are close. The white Vane masks now hold against the dark reference grounds. The top-view direction is corrected. The ambulance and both Vane front projections still show layered seams and do not fully match their photos. The new three-quarter renders also show projection overlap on the ambulance and escort. The dozer arms are thicker and move with the blade, though the front projection still needs a close look.

## Checks

- `python -m py_compile tools/blender/town-trucks-2.py` — passed.
- `node tools/test-blender-output.mjs` — first run found 12,520 dozer triangles. Reduced the body and tread detail; rerun passed 326 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs` — passed. Size targets remain advisory.
- Browser checks and the final look verdict are for Claude. Please inspect all photo/GLB pairs, both three-quarter views and the wheel/lamp details, with attention to front projections, ambulance wheel placement and the dozer blade arms.
- Race fingerprints: not applicable; this is an art-only change.
- Changed assertions: none.
- Lane tier and build: not run, per the art-card instructions.

## Removed

- Deleted `docs/board/looks/town-art-trucks-2/round-2.jpg` as requested. No tests, source references or player data were removed.