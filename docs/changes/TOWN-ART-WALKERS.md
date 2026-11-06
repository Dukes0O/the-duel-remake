# TOWN-ART-WALKERS — round 2

## Changed

- Rebuilt all thirteen town identities from the project's existing Quaternius rescue people (CC0 1.0), rather than primitive bodies. Blender decimation keeps each person within 450 triangles.
- Added independent photo-derived 256 px cloth pictures for each outfit, shaded faces, curved hat silhouettes, a long coat shell, a trader pack, and Vane's blue mark. Named leg pivots remain separate for the town walk cycle.
- Added source and texture credits and an exported-GLB review sheet. The round 1 sheet and note are removed.

## Checks

- Blender recipe with exported-model reimport renders: passed; exported GLB is 583,956 bytes.
- `node tools/test-blender-output.mjs`: passed, 254 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed. Existing size target overages are advisory.
- Browser and in-game look checks: not run here. This asset is not wired into the game. Claude should judge the photo comparison, all thirteen labeled people, and the 40-person crowd in `docs/board/looks/town-art-walkers/round-2.jpg`.
- Race fingerprints: none; no race or simulation files changed.

## Changed assertions

- No test assertions were changed.

## Removed

- Removed the round 1 comparison sheet and review note after keeping a small reference crop and the outfit texture crops needed for this rebuild.
- Blender scene, rendered PNGs and temporary logs are scratch output and will be removed before commit.
