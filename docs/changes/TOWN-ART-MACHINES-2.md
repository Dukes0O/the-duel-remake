# TOWN-ART-MACHINES-2

## Changed

Round 6 adds seven generated, unbranded mustard-yellow machine reference sheets to `public/assets/models/wasteland/town/textures/`, with credits. Each source is about 1,024 px on its long side and shows side, front, rear and overhead views. Numbered 64 px grids were made in scratch output for reference.

The exported family is 2,877,980 bytes. Exported triangle counts: mixer-truck 5,457; crane-truck 5,592; pipe-truck 5,590; roller 5,600; loader 11,624; paver 5,600; drill-rig 5,600. The output test confirmed only `TEXCOORD_0` per primitive, ranged UVs and metallic factors at or below 0.3.

**Acceptance remains incomplete.** These models still use the prior procedural construction. None of the machine bodies was rebuilt with `carve_hull`; the crane boom and drill mast were not traced and slabbed from their photos. The numbered measurement overlays were scratch aids, not a world-measurement recipe. All seven keep the prior model geometry. No old model code was removed. The generated photos and the existing models differ substantially in silhouette and paint. Round 6 is the final allowed art round, so Claude should judge whether to merge these review assets or stop this card as unmet.

The round 6 sheet is `docs/board/looks/town-art-machines-2/round-6.jpg` (252,469 bytes), pairing each photo reference with the exported model at rest and work. Claude should inspect the photo/model mismatch, whole-machine framing, separate named joints, crane and drill lattice, and work poses. Browser and in-game checks were not run in this lane.

## Checks

- Blender export and 14 imported-GLB rest/work renders: passed; 2,877,980-byte family output.
- `node tools/test-blender-output.mjs`: passed, 303 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; placement checks passed.
- Browser, in-game look and lane-tier checks: not run, as instructed.
- Changed assertions: none.
- Race fingerprints: not applicable; art only.

## Removed

Removed the round 5 sheet and review note as requested. No model geometry code was removed because no machine was replaced with photo-carved geometry.