# TOWN-ART-WORKS

## Design settled before code

The card fixes the footprints, axes, object IDs, movable and lit child names, and art direction. It leaves no design question open. The family keeps its existing 1K packed atlas and glTF structure.

## Changed

- Updated `tools/blender/town-works.py` to load eight generated, photo-based material images: rusted pipe steel, weathered timber, red-orange brick, mill plate, corrugated tin, fine sand, wet clay and mixed salvage. The source JPGs are in `public/assets/models/wasteland/town/textures/`; `CREDITS.md` records both prompts and the intended material for each crop.
- Reworked the small material piles. Pipe-stack now has 15 pipes, dark ends and chocks. The pipe pile has 18 pipes. Timber has 15 logs. Brick is a pallet-sized stacked block with the photographic brick pattern and loose bricks. Tin sheets are spread over a wider footprint. Sand and clay are larger sloped mounds with their own material photos.
- Exported `public/assets/models/wasteland/town/works.glb` at 2,593,240 bytes, within the 3 MB family limit.
- Added the 270,312-byte comparison sheet at `docs/board/looks/town-art-works/round-2.jpg` and its review beside it.

## Checks and review

- Blender 4.5.13 generated the GLB and 40 above/driver views. I inspected the round 2 sheet before submission. The model readback check passed 239 checks with no failures, including the per-building triangle and family-size budgets.
- `node tools/test-repo-hygiene.mjs` passed: repository placement passed; size targets are advisory.
- `node tools/test-review-evidence.mjs` passed 8 of 9 tests. The remaining audio-analysis test failed with the known `spawnSync ffmpeg EPERM` error.
- No browser, game look, lane-tier or build checks were run. The family is not wired into a game scene, and this art card does not run the lane tier or build. Claude should review pipe ends, brick/tin readability, tool proportions and the large-building roofs as listed in `round-2-review.md`.
- No assertions changed. Race code and fingerprints do not apply.

## Removed

Replaced the recipe's shared generic material treatment for the town works atlas with the eight photo-backed material crops. No runtime model IDs or parts were removed.


