# TOWN-ART-FUN - big wheel round 9

## Changed

- Replaced the broken photo-traced rim edges with two complete torus rims. The measured radius is 5.02 m; each rim has a 0.15 m tube and samples a rusted strip from the side photo.
- Kept the open photo-carved spokes and added thin steel spokes on both wheel faces, with short depth ties.
- Rebuilt all eight seats at the measured 1.4 m width. Each stays level, hangs from two straight rods, and has printed bounds plus a hanger-contact check.
- Kept the photo-traced A-frame with flat feet and its photographed base beam. Removed the extra beam that rendered detached in front of the feet.
- The pale block under the wheel remains visible in the assembled views. The measured opening was removed from the A-frame mask. Isolated renders of the frame, seat 5, and base beam do not show it alone; its source remains unresolved. Claude must inspect it before judging the art.
- Kept all source photos. The exported family is 6,600,716 bytes, above the card's 3 MB budget.

## Checks

- Blender recipe and imported-GLB renders: completed. All eight seat checks report hanger contact. The two rim bounds show full circles from y=1.605 m to 11.788 m and z=-5.092 m to 5.092 m. The Blender log printed bounds for every big-wheel mesh and each seat.
- `tools/test-repo-hygiene.mjs`: passed; placement passed and size targets were reported as advisory.
- `tools/test-review-evidence.mjs`: 7 passed, 2 failed. One expects the round-8 JPG this task required deleting. The other failed because spawning `ffmpeg` returned `EPERM`.
- `tools/test-blender-output.mjs`: not run; this export is over the 3 MB family budget.
- Lane tier, build, browser checks and Claude's look review: not run here. Claude should inspect the photo/model side match, complete rims and ties, spoke openness, seat scale/orientation/hangers, A-frame feet/base, and unresolved pale block.
- Changed assertions: none. Race fingerprints: not applicable; this art lane does not change race code.

## Removed

- Removed the round-8 traced rim faces and seat-side geometry, replacing them with continuous rings and photo-scaled seats. Kept all round-8 source photos.
- Removed the detached added base beam; retained the source-photo base beam.
- Removed the round-8 JPG and review note as requested. Kept round 6.
