# TOWN-ART-FUN - big wheel round 9

## Changed

- Replaced the broken photo-traced rim edges with two complete torus rims. The measured radius is 5.02 m; each rim has a 0.15 m tube and samples the rusted rim strip in the side photo.
- Kept the photo-carved open spokes and added thin steel spokes across both wheel faces, with short depth ties.
- Rebuilt all eight seats at the measured 1.4 m width. Each remains level, hangs from two straight rods, and has printed bounds plus a hanger-contact check.
- Kept the photo-traced A-frame, whose feet meet the ground. Removed the extra beam that rendered detached in front of the feet; the photo already contains the base beam.
- The pale block under the wheel remains visible in the assembled renders. I removed the enclosed pale opening from the A-frame mask and isolated the frame, seat 5 and base beam; none shows the block alone. The assembled view still shows it, so its source remains unresolved. Claude must inspect it before treating the art as passed.
- Kept the source photos. The exported family is 6,600,716 bytes, above the card's 3 MB budget.

## Checks

- Blender recipe and imported-GLB renders: completed. All eight seat checks report hanger contact. Rim bounds show full circles from y=1.605 m to 11.788 m and z=-5.092 m to 5.092 m.
- `tools/test-blender-output.mjs`: not run; this export is over its 3 MB family budget.
- `tools/test-repo-hygiene.mjs` and `tools/test-review-evidence.mjs`: pending final run.
- Lane tier, build, browser checks and game look review: not run here. Claude should inspect the photo/model side match, complete rims and ties, spoke openness, seat scale/orientation/hangers, A-frame feet/base, and the unresolved pale block.
- Changed assertions: none. Race fingerprints: not applicable; this art lane does not change race code.

## Removed

- Removed the round-8 traced rim faces and seat-side geometry, replacing them with continuous rings and photo-scaled seats. Kept all round-8 source photos.
- Removed the detached added base beam; retained the source-photo base beam.
- Round-8 review sheet and note are removed with the round-9 sheet commit. Round 6 remains.
