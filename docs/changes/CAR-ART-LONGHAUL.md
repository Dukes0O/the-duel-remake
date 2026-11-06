# CAR-ART-LONGHAUL

## Changed

- Reworked `tools/blender/longhaul.py` for round 4: enclosed cab panels and smaller dark windows, grille mesh, bumper shackles, non-overlapping tandem axles, clear side tanks, visible tread blocks, dark hubs and joined bed recovery gear.
- Kept the approved rusted paint and dusty rubber images and material settings unchanged. Their prompts and credits remain in `public/assets/models/wasteland/cars/textures/CREDITS.md`.
- Re-exported `public/assets/models/wasteland/cars/longhaul.glb`: 24,956 triangles and 2,049,716 bytes. Its five view renders came from the exported GLB imported into an empty Blender scene.
- Added `docs/board/looks/car-art-longhaul/round-4.jpg` (285,839 bytes) and `round-4-review.md`. The sheet includes a fitted reference view from the new generated photo and the five review views.

## Checks

- Blender recipe export and re-import render: passed; five views rendered. GLB size and triangle count remain within the card limits.
- GLB inspection: passed; all 537 primitives use a ranged `TEXCOORD_0` only, and the highest material metallic factor is 0.25.
- `node tools/test-blender-output.mjs`: passed, 232 checks.
- `node tools/test-repo-hygiene.mjs`: passed; placement is valid and the reported size targets are advisory.
- No lane tier or build was run, as directed for this art card.
- Browser and in-game look checks were not run in this lane. Claude should review cab shape and glass, mesh grille and bull bar, wheel-lug visibility and arch clearance, tank spacing, tandem axle spacing, rear A-frame, rack and full-truck framing in the round-4 sheet.
- Changed assertions: none.
- Race fingerprints: unchanged; no simulation or race code changed.

## Removed

- Removed the round-1 and round-2 sheets and review notes as superseded by this round. Replaced the round-3 cab frame, large side panes, even axle spacing, subtle tyre tread and long side rub rails in the recipe and model. No backup model or trial render is retained.
