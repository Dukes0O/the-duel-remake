# TOWN-ART-SERVICES — scrapyard round 3

## Changed

- Replaced the two pale-looking carved car sources with four generated photo
  references: separate red/rust and dull-blue/brown side and overhead views.
- Built nine cars from traced side-photo silhouettes, extruded from -0.9 m to
  +0.9 m. Each is 4.2 m long and 0.9 m high. The two-sided faces use the side
  photos; a traced overhead photo follows the measured side roof line.
- Kept five cars in the left pile and four in the right. Alternating shifts and
  slight turns make each pile about 5.36 m wide. The piles are 4.5 m and 3.6 m
  high below the 9.09 m crane; every upper car touches the one below.
- Measured the reference grid: crane about 435 px across and 205 px high;
  left pile about 133 x 78 px, right pile about 108 x 81 px. Their heights are
  about 38% and 40% of crane height; the model piles are about 50% and 40%.
  Model pile width is about 27% of crane span, near the reference's 25–31%.
- Kept the crane, magnet, fence and ground scrap. The services GLB is 5,310,228
  bytes (8 MB limit). `round-3.jpg` is 223,529 bytes; `round-6.jpg` is intact.
- Added the smoothing fault to `docs/ART_LINE.md`.

## Builder review

| Measure | Score | Note |
| --- | ---: | --- |
| Reference resemblance | 4 | Open crane, magnet and two separate car piles match. The generated cars read as crushed vehicles from the road and overhead views. |
| Proportions | 4 | Each car is 4.2 x 1.8 x 0.9 m; the four- and five-car piles reach the reference proportions. |
| Materials | 4 | Rust, faded red, dull blue and brown show on the photographed cars; crane and fence remain separate. |
| Detail | 4 | Wheels, broken windows, dents and crushed panels stay legible in the side photos. |
| Grounding | 5 | Both base cars meet the ground. All seven upper cars have zero vertical gap and positive overlap with the car below. |
| Mayor and road readability | 4 | Piles read from both views. Claude should review the roof photos and slight layer offsets. |

## Checks

- Blender recipe, GLB export and rendered views: passed. Every scrapyard piece
  meets the existing footprint and ground/contact audit; all seven upper-car
  contact checks pass.
- `node tools/test-blender-output.mjs`: passed, 356 checks.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement is clean.
  Size targets remain advisory.
- `node tools/test-review-evidence.mjs`: passed, 9 subtests and 549 checks.
  Its first attempt ran before the round-2 deletion was staged and could not
  spawn `ffmpeg` (`EPERM`); the staged rerun passed all checks with the
  required local process permission. No assertion changed.
- Lane tier, build and browser checks: not run, as instructed for this art
  card. Claude should inspect `round-3.jpg`, especially the matched photo,
  roof faces, pile width and road-level car details.
- Changed assertions: none. Race fingerprints: not applicable; this art is
  not wired into a race.

## Removed

- Removed `round-2.jpg` and `round-2-review.md`, as directed. Kept
  `round-6.jpg` and `round-6-review.md`.
- Replaced the unused blue and ochre four-view car photos with the four
  separate round-3 side and overhead photos. Crane, fence and ground-scrap
  photos and geometry remain.
- Temporary grids, renders, Blender files, logs and the sheet-making helper
  were removed after the checks. No game code, test assertion or runtime
  dependency was removed or changed.
