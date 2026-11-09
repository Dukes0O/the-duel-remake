# TOWN-ART-MACHINES-2 ? round 14: crane truck

## Result

Does not pass yet. This is the crane truck's third round on the photo-carved method. The mixer truck recipe and its exported geometry were left unchanged.

The round disc now shows the photographed toothed circle without the square deck plate. Two cheek plates and a cross pin sit at the boom's hinge height. The outriggers are painted box beams with photo-faced front plates, silver jacks and square silver feet.

The rear is improved but still visibly wrong. The flat counterweight face uses the rear photo, while the cab and boom support still project as layered shapes above it. The counterweight sides look blocky. Claude should decide whether this rear result is useful or needs another method.

## Review

- Turntable: the cap is UV-mapped inside the source photo's circle; the circular support and no square deck leave the circle visible from overhead.
- Pivot: paired painted cheek plates and a silver pin align with the boom node origin.
- Rear: the counterweight face uses the rear photo. The side and top projections above it remain a visible flaw.
- Outriggers: four box-beam supports have worn photo paint on their front faces, sliding boxes, silver jack cylinders, collars and square feet.
- The sheet compares side, front, rear, overhead and both articulated poses from the imported GLB.

## Checks

- Blender 4.5.13 generated the candidate and six imported-GLB views.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed** (complete run). The GLB guard confirms every machine is present and under 15,000 triangles.
- Family GLB: **5,449,472 bytes**. Crane truck: **5,600 triangles**.
- `round-14.jpg`: **426,148 bytes** (500 KB limit).
- No browser or game look check was run. Claude should judge all six sheet panels, especially the rear body projection, the turntable circle and pivot, and the beam faces and silver feet.
- node tools/test-repo-hygiene.mjs: passed.
- node tools/test-review-evidence.mjs: 8 checks passed, 1 audio-analysis check failed because Windows blocked ffmpeg (spawnSync ffmpeg EPERM). The review JPG publication check passed; assertions were unchanged.
- No assertions changed. No gameplay changes; race fingerprints do not apply.

## Removed

- Replaced the square turntable deck, old outrigger bars, dark jack feet and rear projection carve with the round disc, photo-faced box beams, silver feet and flat counterweight face.
- The mixer truck's model and recipe were not changed.
