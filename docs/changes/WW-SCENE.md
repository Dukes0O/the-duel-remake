# WW-SCENE

## Changed

- Added the Scablands world scene with shared-height ground chunks, a coarser far ground mesh, the dirt road, distant radio mast and Everburn smoke.
- Placed the merged world art at its named places. Near place art uses full detail; distant places use low-detail silhouettes.
- Added static solid boxes keyed to the place table. The mall now has darker materials, high-contrast named sign materials and rubble dressing. Old Smoke's furnace is scaled up and gets fire at its doors and smoke at its chimney.
- Hooked the scene into `buildEnvironment` for the Scablands venue.

## Checks

- `node tools/test-scablands-scene.mjs` — passed.
- `npm run build` — passed with Vite 8.0.16 (650 modules transformed).
- Browser check — Claude runs.
- Look check — Claude runs: check mall sign contrast, rubble, lamps and stray rods; Old Smoke's scale, door flames and chimney smoke; the mast and Everburn plume at long distance; far-place silhouettes and near-place detail.
- Frame check — Claude runs at the busiest view with eight cars, Performance and High quality.

Changed assertions: none in existing tests. Added scene assertions for place anchors, collision boxes, shared ground height, far detail density and landmarks.

Race fingerprints: none recorded; this card changes presentation only and does not edit simulation or replay fixtures.

## Removed

- None.
