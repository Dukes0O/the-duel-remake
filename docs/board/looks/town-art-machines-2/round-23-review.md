# TOWN-ART-MACHINES-2 — round 23: roller

## Result

Fourth roller round of six. Measured the new side photo: body start x=46, body end x=588, rear tyre centre x=453. The carve is 5.1 m long, so the axle is at ((453 - 46) / (588 - 46)) × 5.1 - 2.55 = z 1.28 m. The carve wheel well and both built tyres use this axle. The separate tyre face is mapped from the new photo centre. Cut the photographed tyre areas from the side, front, rear and overhead carve masks so the tyre geometry is built only once.

The body-parent and camera-up-axis fixes from round 22 remain. The mixer truck, crane truck and pipe truck recipe sections were not changed. Exported family size is 5,807,220 bytes. The output check passes its 15,000-triangle per-machine limits.

This round is **not a pass**. The built tyre faces still read as plain brown discs with little visible tread, especially in the assembled views. The lower body and drum also show projection seams, and the front/rear comparisons include the built drum while the source photos are drumless. Claude should review the axle placement in the side and three-quarter views, tyre face/tread readability, lower-body continuity, and drum/yoke contact. Also confirm the three unchanged trucks remain as before.

## Checks

- Blender 4.5.13 family export and six roller renders from the exported GLB completed.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed**.
- No lane tier or build was run, per the art-card instructions. No browser or look check was run; Claude should review `round-23.jpg`.
- Changed assertions: none. Race fingerprints: not applicable to this art change.

## Removed

- Cut photographed tyre discs out of the roller carve masks in all four photos. No files or model parts were removed; the drum, canopy, posts, yoke, and built tyres remain separate pieces.
