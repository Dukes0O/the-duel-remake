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

## Kiln — round 1

### Changed

- Added one `kiln` child beside the existing `warehouse` in
  `tools/blender/town-works.py`. The 2×2 kiln has a round brick dome lathed from
  its measured side photo, a separate lathed chimney, a photo-faced arched
  firing door, emissive `kiln:lamp`, stacked bricks and a woodpile.
- Added six single-view JPG references (dome side, front, rear and top, chimney,
  and door) under `public/assets/models/wasteland/town/textures/`. Each is at
  most 1024 pixels wide. The recipe credits their OpenAI image generation.
- Exported `public/assets/models/wasteland/town/works.glb` at 1,801,204 bytes.
  The sheet is 473,043 bytes at 2048×2734 in
  `docs/board/looks/town-art-works-kiln/round-1.jpg`.
- The recipe prints bounds for the body and every named piece. Every piece
  touches the ground or another piece and stays within the 2×2 footprint.
- Blender 4.5.13 exported and rendered the GLB in a clean scene. I compared the
  side, front, rear, straight-down, two three-quarter and 45° mayor views with
  the source photos, then corrected the saved-photo pixel scale, doorway photo
  and top-view orientation. The review is beside the sheet.
- `node tools/test-blender-output.mjs`: **394 checks passed, 0 failed**.
  Two earlier runs exposed outdated expectations for child order and the
  preserved warehouse photos; the final assertion checks the exact two roots
  without relying on export order and keeps all ten embedded images accounted
  for.
- `node tools/test-repo-hygiene.mjs`: passed repository placement; size targets
  are advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 passed. The audio-analysis
  subtest failed because the sandbox returned `spawnSync ffmpeg EPERM`; review
  JPG publication passed.
- No lane tier, build, browser scenario or in-game look check was run. Claude
  should inspect the firing-door opening and glow, the mayor view, and the
  spacing and readability of the brick and wood piles.
- Changed assertions: the family check now requires both `warehouse` and
  `kiln`, verifies the kiln's 5,000-triangle budget and named pieces, and counts
  the four preserved warehouse photos, four kiln photos and two material
  tiles. This extends the card's acceptance and keeps its checks exact; no
  race rules or fingerprints changed. Claude should review this assertion
  update before merge.

### Removed

The current recipe had no earlier kiln block-shape path to remove; it exported
the warehouse only. The new GLB contains no block-shaped kiln. The passed
warehouse geometry and its four reference photos remain in the family.

## Sawmill — round 1

### Changed

- Added the 3×2 `sawmill` to `tools/blender/town-works.py` as an open timber
  frame with a pitched tin roof, a photo-carved saw bench, a separate thin
  circular blade, carriage and log, two bark-log stacks, and a sawdust mound.
  The former block placeholder is no longer exported. The existing warehouse
  and kiln recipes were left in place.
- Added four single-view shed photos, four bench photos, and separate blade,
  bark and sawdust photos under `public/assets/models/wasteland/town/textures/`.
  `sawmill-CREDITS.md` credits the generated photos.
- Exported `works.glb` at 3,562,296 bytes. The warehouse remains at 8,040
  triangles, the kiln at 2,467, and the sawmill at 8,772, within the 9,000
  triangle budget. The family contains 21 embedded images.
- Added the 461,338-byte sheet and review at
  `docs/board/looks/town-art-works-sawmill/round-1.jpg` and
  `round-1-review.md`. The recipe prints bounds for all nine named sawmill
  pieces and checks that each stays within the 3×2 footprint and touches the
  ground or another piece.

### Checks and review

- Blender 4.5.13 exported the family, printed the piece bounds, and rendered
  the seven requested review views. I compared the side, front, rear and
  overhead views beside their source photos, plus both three-quarter views and
  the mayor view. The other works buildings were hidden.
- `node tools/test-blender-output.mjs`: **394 checks passed, 0 failed**.
  The first run found 34,884 sawmill triangles and an outdated 3 MB cap in the
  runner; the mesh was reduced to 8,772 triangles, and the runner cap was
  brought to the card's 8 MB allowance. Neither change weakens a test.
- The family assertion now requires all three buildings, checks the sawmill's
  9,000-triangle budget and its nine named parts, and checks that the embedded
  photos are present. The generator file cap changed from 3 MB to 8 MB to match
  the card. No race code or fingerprints changed.
- No lane tier, build, browser scenario or in-game look check was run. Claude
  should inspect the saw blade's size and visibility, roof surface, log stacks
  and sawdust mound from the driver and mayor views.

### Removed

Removed the sawmill's block placeholder from the exported family and replaced
it with the named frame, roof and work pieces. The passed warehouse and kiln
remain in the family.

## Sawmill — round 2

### Changed

- Resized the sawmill from the side and front photo proportions: 15 m long,
  7.5 m wide, 5.7 m to the ridge, with about a 30° pitch. It remains inside
  the 3×2 footprint.
- Mapped the roof photo across the full length and both slopes. Traced the
  photographed timber posts, braces and trusses, then slabbed the frame at
  each of five post lines with the gaps kept open.
- Increased the vertical saw disc to 1.2 m across and raised it through the
  bench so more of it shows. Warehouse and kiln source sections were untouched.
- Added `round-2.jpg` (420,969 bytes) and `round-2-review.md` beside the
  sawmill sheets. The review records remaining visual questions for Claude.

### Checks and review

- Blender 4.5.13 exported the GLB and rendered side, front, rear, overhead,
  two three-quarter and mayor views. I inspected the exported model in each.
- `node tools/test-blender-output.mjs`: **394 checks passed, 0 failed**.
  This includes the sawmill's 9,000-triangle limit and the family GLB readback.
- No lane tier, build, browser scenario or in-game look check was run. Claude
  should inspect the roof photo mapping, timber texture, blade visibility,
  stacks and sawdust from driver and mayor views.
- No assertions changed. Race code and fingerprints do not apply.

### Removed

Replaced the sawmill's round-1 shed dimensions, beam-built frame, roof mapping
and blade placement with the photo-proportioned round-2 version. The warehouse
and kiln remain unchanged in the exported family.
