# WW-ART-WHITES, round 4

## Changed

- Seeded the conveyor photo's open bays so sky is removed between its legs.
- Replaced traced fence strands with photo-backed alpha panels. The source photo becomes an RGBA PNG; the GLB uses `MASK` alpha with a 0.5 cutoff. Added separate 8 cm iron posts and kept the clean VANE RECLAMATION sign.
- Bled each hut side photo from its solid mask and mapped roof faces to a measured strip of roof tin below the sky edge.
- Rendered the complete family from the exported GLB in two rows on near-white ground. The comparison sheet keeps the same three-column reference, side, and quarter layout, followed by the family view.
- Replaced the round-3 sheet and review note with round 4.

## Checks

- Blender rebuild and exported-GLB renders: passed. Conveyor side and quarter views show the open bays; the fence quarter shows the alpha wire and clean sign; the family render shows all eight pieces in two rows.
- `node tools/test-blender-output.mjs`: passed, 296 checks and 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; placement is clean and size targets are advisory.
- Read-back GLB: 43,578 triangles, 3,364,592 bytes. Its fence material reads `alphaMode: MASK`, cutoff 0.5, and the embedded fence texture is PNG with alpha.
- Claude should inspect `docs/board/looks/ww-art-whites/round-4.jpg`, especially the conveyor gaps, fence wire and sign, hut roof edges, and two-row family arrangement.
- Browser checks: not applicable to this art card. Race fingerprints: not applicable; no race code or rules changed. Changed assertions: none.

## Removed

- Removed the round-3 sheet and review note when replacing them with round 4.
- Removed temporary renders, build logs, GLB inspection and sheet composition scripts from `.qa-dist` after review.
