# GFX-02-P1 — Round 3 visual review

The reviewed candidate is `art-build/first-person-p1/candidate/hands/rook.glb`, SHA-256 `8b985010d7a511503fa2fdeb37d7665bfad420f09b6751f87110d3ce55e30579`. Its source JSON SHA-256 is `65efc6cbe282906a05a87a0ea8682cc4b1c4079ef34cb812bacb20f5ee1f2a95`; the frozen generator SHA-256 is `86219dd4da2e085f058fa84581601ac5245e2ebe969633ad6b507376309381bb`. The selected cloth/leather/wrap image SHA-256 is `785c80bb03380c6454607e5fba687b633e47642cac0a1b58d7176afdf9a64b3b`. The candidate has 4,260 hand triangles and one hand draw. The immutable comparison is `round-3.jpg`, SHA-256 `1eaa55a3c5ecd7d5b79f20f089d4c59d0f201fe082ad80a2c31b0e4154f5efbe`. The formal private game capture is `.evidence/2026-09-25/first-person-p1/round-3-final` at observation commit `26f55a0cbb8749bd9b52136104474a9416be7988`. That observation commit had dirty generator/source files; the exact file and candidate hashes identify the reviewed bytes. The later source checkpoint is separate. The earlier `round-3` folder is diagnostic and was not scored.

The formal run captured 16 matched High/Performance game poses plus real input evidence with zero reported issues. Each quality observed one candidate substitution; all eight production hand hashes matched before and after. Blender columns show the source module; game columns show the actual course. These are visual comparisons, not a common-lighting pixel match.

| Reviewer | Resemblance | Readability | Grounding | Scene consistency | Frame cost |
| --- | ---: | ---: | ---: | ---: | --- |
| Crew, independent | 3 | 4 | 3 | 3 | 4, scoped idle A1/B/A2 |
| Director | 3 | 4 | 3 | 3 | 4, scoped idle A1/B/A2 |

The selected paint now visibly reaches the sleeves and gloves. Independent exported-face tests trace actual glTF UVs into the embedded atlas and match the selected source crop; they reject inverse-V sampling. Both the legacy top skin tile and the material-consumed bottom skin tile match their R2 bytes. The physical-angle sleeve-fold test rejects frozen R2 (2/9) and pre-fix R3 (3/9), then passes corrected R3 at the unchanged 4/9, 2.5 mm threshold. The focused first-person suite passed 24/24 on the corrected candidate.

Five remaining visual gaps are most apparent in formal idle, aim, reload and wrench views:

1. Both forearms still read as long tapered tubes. The localized folds have little broad silhouette or light/shadow effect at game distance.
2. The cloth texture is visible, but its coarse repeated speckles do not reproduce the reference's layered cloth and broad directional creases.
3. The pale wrist wraps read as clean, even rings instead of overlapping, worn strips with varied edges.
4. Glove backs and thumb/finger pads remain smooth and bulbous, with little seam, knuckle or stitch structure.
5. A broad bare-skin transition remains beside the right glove and wrist wrap, especially in aim and wrench poses.

The quiet frame report at `.evidence/2026-09-25/first-person-p1/frame-cost-r3-1/cost.json` used the same frozen candidate and visible production A1 / candidate B / production A2 in both qualities. Each branch used 30 warm frames and 600 ordered native RAF samples with one whole `renderFrame` call per frame. The largest candidate ratio against either baseline was 1.0323 across CPU mean, CPU p95 and RAF p95, within the 1.10 gate. This measures the stopped idle RPG view, not GPU time or the cost of all actions. Performance reported 70 / 48 / 48 allocated textures for A1 / B / A2, whereas High reported 71 / 71 / 71. This difference includes nonactive gear loading, so it cannot be credited as a candidate resource saving. The active hands and RPG still contain six embedded 1024 maps in either branch and the same estimated decoded RGBA8 mip allocation; that estimate is not measured GPU memory.

This round improves material visibility and passes the scoped frame gate, but resemblance remains below four. Static images and synthetic contact tests do not establish continuous hand/tool contact or penetration across live animation. The private production-rendered contact diagnostic ended with unsupported grip-component selection, so continuous contact remains unmet. This candidate is not promoted to runtime by this review.
