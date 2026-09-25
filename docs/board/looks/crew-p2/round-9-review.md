# Round 9 independent Rook review

I reviewed `round-9.jpg` and the 44 private High and Performance captures at `.evidence/2026-09-25/crew-p2/round-9/`, including idle front/side/back, aim front, and get-up side. The browser run reports zero issues. The candidate GLB is SHA-256 `db6798648ce0b2a29e8c0b15df60a4a81024672ac488df3a51c4df019a69d574`. This is a development trial; the current runtime Rook is unchanged.

| Axis | Independent score | Evidence |
| --- | ---: | --- |
| Reference likeness | 3/5 | The wider leg stance, fitted boots, open vest edge and single back drape improve the silhouette over round 8. The hair is still a smooth parted cap, the scarf/vest still forms broad tan boards, and the lower clothing lacks the reference's layered cargo shapes. |
| Readability | 3/5 | Shirt, vest, sleeves, trousers and boots separate at game scale, but the nearly black waist seam, flat side vest and small hands hide important shapes. The back drape reads as a large geometric triangle. |
| Grounding | 3/5 | Idle feet are planted, and get-up retains a coherent leg and boot pose. Actual skinned boot-top to trouser-surface p90 gaps are 35/35 mm in idle, 34/34 mm in aim and 36/46 mm in get-up (left/right); the right get-up joint is the loosest. The High aim-front dark waist band is cloth/belt pixels, not exposed grey background. |
| Scene consistency | 3/5 | High and Performance retain the same proportions, materials, action silhouette and remaining defects. |
| Frame cost | Unmeasured | Visual captures do not measure the twelve-fighter frame budget. |

Five remaining visual gaps, in priority order:

1. The tan front vest and pockets remain bulky, rectangular panels. The reference has a broader layered scarf, thinner folded vest fronts and irregular soft pocket edges.
2. Side view shows a flat vertical vest/pack profile and little garment depth; the back drape is a clean triangle over a round satchel rather than layered fabric and gear.
3. Hair still reads as a smooth parted cap. It lacks the reference's broken curl silhouette around the forehead, temples and nape.
4. The trousers now occupy the measured stance, but the repeated mottled texture and smooth leg tubes do not show large asymmetric cargo pouches, knee folds or cuff bunching seen in the reference.
5. Boots and hands remain simple at game scale. The boot shafts have blunt toes and a narrow visible cuff transition; fingers do not separate enough in the action views.

Independent export checks support the narrow structural claims: the painted and structural near/far position, normal, UV, skin and index buffers are byte-identical, with 7,340/1,834 triangles and the same twelve clips. The painted atlas maps are embedded byte-for-byte, source and landmark hashes match the manifest, and targeted exported garment/rig checks pass 8/8. These checks do not raise the visual likeness score or establish the frame budget. In the High aim-front image, center pixels across y273–315 are dark belt or trouser colors rather than background; the waist needs clearer material separation, not an unproven hole repair.

Director review independently agrees at3/3/3/3 after viewing the matched sheet,
High idle front/side/back and aim, and Performance get-up at48percent. The
initial apparent aim-waist slit was disproved by the independent native pixel
check; it is a dark seam, not a confirmed physical gap. Private port20428,
44 captures, zero warnings/errors; the immutable sheet is90,800bytes. One
round remains in this wave. Keep runtime Rook and the other seven crew
unchanged; write the new hair construction method before round10 code.
