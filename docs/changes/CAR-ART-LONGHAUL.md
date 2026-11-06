# CAR-ART-LONGHAUL

## Changed

- Rebuilt the truck geometry in `tools/blender/longhaul.py` to correct the fuel tank axes, join the cab and chassis, mount the cab and cargo to the rails and deck, and make the wheels round with continuous arches.
- Re-exported `public/assets/models/wasteland/cars/longhaul.glb` (23,668 triangles, 1,664,140 bytes). Existing paint and rubber pictures and material settings are unchanged.
- Added the exported-GLB comparison sheet `docs/board/looks/car-art-longhaul/round-3.jpg` (316,331 bytes) and its review note.

## Checks

- Blender recipe render: passed; exported GLB imported into an empty scene and all five review views rendered.
- Exported GLB UV inspection: passed; 291 of 291 primitives use only `TEXCOORD_0`, and all have a non-degenerate coordinate range.
- `node tools/test-blender-output.mjs`: passed, 232 checks.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement is valid. Reported size targets remain advisory.
- No lane tier or build was run, as directed for art cards.
- Browser and in-game look checks were not run in this lane. Claude should review the round-3 sheet, especially the flat-fronted cab, windshield and side windows, horizontal tanks, chassis-to-cab and deck connections, wheel outline and arches, rack contents and truck scale.
- Changed assertions: none.
- Race fingerprints: unchanged; no simulation or race code changed.

## Removed

- Replaced the round-2 upright tank cylinders, separated cab panels, disconnected supports and angular tread outline in the recipe and GLB. No backup model or trial render is retained.
