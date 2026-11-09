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

## Warehouse — round 1

### Changed

- Replaced the earlier all-building recipe output with the card's first slice:
  one photo-carved warehouse under `town-works`, with separate front, side and
  rear loading doors, a loading dock and two roof vents.
- Added four original single-view reference photos to the town texture folder
  and credited them in `CREDITS.md`. The overhead photo is rotated 180° after
  grid measurement so its front edge matches `carve_object`'s row convention.
- The exported GLB is 838,044 bytes with 8,040 triangles and four embedded
  photos. The round-1 sheet is 452,301 bytes at 2048×2734 in
  `docs/board/looks/town-art-works-warehouse/round-1.jpg`. Bounds and contact
  checks pass; their envelope and the self-review are in the adjacent review
  note.
- Blender 4.5.13 exported and rendered the GLB in a clean scene. I inspected
  side, front, rear, straight-down, both three-quarter and mayor views.
- `node tools/test-blender-output.mjs`: **394 checks passed, 0 failed**.
- `node tools/test-repo-hygiene.mjs`: passed; placement passed and size targets
  remain advisory.
- `node tools/test-review-evidence.mjs`: 8/9 passed on both runs. The only
  failure is its audio-analysis subtest (`spawnSync ffmpeg EPERM`) in the
  sandbox. The JPG publication subtest passed.
- Browser checks and the game look check were not run in this art lane. Claude
  should review the listed details in `round-1-review.md`.
- The family check now asserts the warehouse is the only direct child and has
  at most 9,000 triangles. This narrows the prior 20-building expectation to
  the card's one-building slice; it does not lower the warehouse threshold.
  The family byte cap is the card's 8 MB allowance. No race fingerprints apply.

### Removed

Removed the recipe geometry for the later card buildings from this first-slice
export. Their IDs are not included yet and will return in later rounds. The
existing family `round-1.jpg` and `round-2.jpg` remain. Replaced the earlier
3 MB family cap in the check with the card's 8 MB cap; this GLB is under 1 MB.
