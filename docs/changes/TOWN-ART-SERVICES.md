# TOWN-ART-SERVICES — scrapyard round 2

## Changed

- Rebuilt the two scrapyard stacks from nine separate carved crushed cars, using two generated four-view photo sets for turquoise and ochre/green paint.
- Each car is approximately 4.2 m by 1.8 m and 0.46–0.48 m tall. The left stack has five cars (2.32 m high); the right has four (1.87 m high). Small alternating offsets keep edges visible.
- Added three ground-set tyres, four bricks and two loose sheet scraps near the piles. Kept the round 1 crane, hanging magnet and fence.
- The scrapyard GLB reads back at 8,770 triangles (9,000 maximum). The family GLB is 4,861,896 bytes (8 MB maximum).
- The Blender audit printed the bounds of every scrapyard mesh. All nine cars pass: both base cars meet the ground and all seven upper cars have zero vertical gap and positive overlap with the car below. The three tyres and four bricks meet the ground.
- Added `round-2.jpg` (220,937 bytes) and this review note. Kept `round-6.jpg` unchanged.

## Checks

- Blender recipe and render: passed; exported `services.glb`, rendered the round 2 views and passed the in-recipe scrapyard footprint and contact assertions.
- `node tools/test-blender-output.mjs`: passed, 352 checks.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement clean. Size targets remain advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests pass in the final state. The other subtest still expects `round-1.jpg` at `tools/test-review-evidence.mjs:167`; this task explicitly removes that sheet, so I left the assertion unchanged. Before the removal, the elevated run passed all 9 subtests. The initial run was blocked from spawning `ffmpeg` (`EPERM`); an elevated retry ran successfully.
- Lane tier and build: not run, as instructed for this art card.
- Browser/look check: Claude should review the matched photo, road, three-quarter and mayor views in `round-2.jpg`.
- Changed assertions: none.
- Race fingerprints: not applicable; this is unconnected art.

## Removed

- Removed the four obsolete round 1 photos of an entire car stack; the new individual car photos replace them.
- Removed `round-1.jpg` and `round-1-review.md` as requested. `round-6.jpg` remains unchanged.
- Removed generated masks, renders, Blender files, grids and logs from `.evidence/` and `.qa-dist/` after preparing the committed sheet and model.
