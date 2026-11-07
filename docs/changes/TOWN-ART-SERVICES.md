# TOWN-ART-SERVICES - scrapyard round 4

## Design settled before code

Keep the accepted crane, magnet, fence, yard scrap and the measured five-car and four-car piles. Replace the clean, pastel-looking wrecks with three generated crushed-car references: dark red/rust sedan, brown coupe and dull navy hatchback. Trace side and overhead views, remove pale studio color trapped in the photos, and alternate types so adjacent wrecks differ. Keep the 4.2 m length, 1.8 m width, 0.9 m height, footprint and building budgets.

## Changed

- Added six generated orthographic photo references and a provenance note in the town texture folder. Rotated the overhead views to align their car length with the side views.
- Replaced the two-color stack pattern with three distinct crushed wrecks: red/rust, brown and dull navy.
- Kept the silhouette mask separate from the texture bleed mask. Pale neutral studio pixels trapped inside a wreck are replaced before tracing; the complete car outline remains.
- Exported the 12-building family GLB at 5,667,920 bytes, within the card's 8 MB limit. The round-4 review sheet is 252,175 bytes.

## Builder review

| Measure | Score | Note |
| --- | ---: | --- |
| Reference resemblance | 4 | Three dark, crushed wreck types replace the toy-like pastel cars; the crane and two distinct piles remain. |
| Proportions | 4 | Car sizes and stack heights remain within the measured scrapyard composition. |
| Materials | 4 | Rust, faded red, brown and navy are distinct; the photos retain dents and torn panels. |
| Color | 4 | Pale studio color no longer remains on the traced car edges. |
| Detail | 4 | Collapsed roofs, empty windows, wheels and damaged panels read from both camera views. |
| Wear | 4 | Paint is faded and patchy, with dark rust and grime. |
| Road and mayor readability | 4 | The piles remain readable from both viewpoints. |
| Grounding | 5 | Both base cars rest on the ground and all seven upper cars touch the layer below. |
| Frame cost | Not measured | Art-only family, not wired into a reachable scene. |

Claude should inspect the generated views, the neutral-background bleed, mixed stack colors, stack contacts and roof treatment in `round-4.jpg`.

## Checks

- Blender recipe export and review renders: passed. All scrapyard footprint and ground/contact audits passed; all seven stacked-car contact checks passed.
- `node tools/test-blender-output.mjs`: passed, 361 checks and 0 failures. The first two runs found 11,344 and then 9,127 scrapyard triangles against the unchanged 9,000 limit. Raising photo-outline tolerance to 6 px brought the scrapyard under budget; no assertion or model dimensions changed.
- `node tools/test-repo-hygiene.mjs`: passed. Repository placement is clean; reported size targets remain advisory.
- `node tools/test-review-evidence.mjs`: final run passed all 9 subtests and 549 checks. The earlier attempt hit `ffmpeg EPERM`; it passed on the permitted same-state rerun. No game code changed between attempts.
- Lane tier and build: not run; this art card excludes them. No browser check or frame timing applies.
- Changed assertions: none. Race fingerprints: not applicable; this art is not wired into a race.

## Removed

- Removed `round-3.jpg` and `round-3-review.md`; kept `round-6.jpg` and `round-6-review.md` as instructed.
- Replaced the four round-3 car photos with the six round-4 photos. The crane, fence and yard scrap photos and geometry remain.
- Recycled temporary grids, renders, Blender project, logs and sheet-making scratch output after the checks. No game code, test assertion or runtime dependency changed.
