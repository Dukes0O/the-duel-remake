# Crew round 9: Rook sculpt and retopology

Rook only changed. [Matched sheet](round-9.jpg) compares the approved reference, Blender and private memory-only game captures in High and Performance, front, side and back. Forty-four focused captures covered idle and Rook actions with no browser warnings or errors. The seven other GLBs were unchanged. No beta promotion follows.

| Rook score | Likeness | Readability | Grounding | Scene | Cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| Round 3 | 3 | 3 | 3 | 4 | 4 |
| Round 8 | 2 | 2 | 3 | 3 | provisional |
| Round 9 | 2 | 3 | 3 | 3 | provisional |

The Blender recipe now sculpts a high-resolution connected body with localized shoulder, sleeve and trouser folds, then uses Quadriflow retopology. The vest is a draped shell, and skin weights and padded material UVs are transferred to the low-poly export. This improves the topology but does not raise the in-game likeness score. Independent review finds likeness two: the clothing and face are still too weak.

Five largest differences: (1) back of the head shows front face features, an invalid UV assignment; (2) scarf is a tall squared collar and the head is too small against wide shoulders; (3) vest looks like two inflated lobes rather than thin open panels with pockets and a draped collar; (4) trouser folds repeat as corrugated rings while side cargo pouches remain weak; (5) boots lack the reference's toe, laces and heel shape. The back also lacks its draped canvas and crossed straps. Round 10 will fix these specific faults, then score the final matched game views. The Rook gate of likeness four still blocks conversion of the seven other crew members.

The exported asset passes the connected-core test and 26 existing crew animation/asset checks at 7,700 near and 1,860 far triangles. The focused scenario did not measure twelve-fighter frame cost or GPU time; cost remains provisional.
