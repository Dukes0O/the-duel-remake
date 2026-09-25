# Round 10 independent Rook review

I compared `round-10.jpg` with the approved reference and inspected the 44 private High and Performance captures in `.evidence/2026-09-25/crew-p2/round-10/`: idle front, side and back, aim front, and get-up side. The capture on private port 26162 reported zero issues or warnings. The frozen painted candidate is SHA-256 `32628d4c751b389eb573b3bb9e5f4559778ed3254dcdd85739015f4899883350`; source checkpoint is `a9926bf`. This is the tenth development round, not a runtime promotion.

| Criterion | Independent score | Evidence |
| --- | ---: | --- |
| Reference likeness | 3/5 | The new hair locks cover and project beyond the scalp in source, but the actual front and side game views still read as one low, smooth cap. Face, scarf, vest and trousers remain much simpler than the reference. The score has not risen from round 9. |
| Readability | 3/5 | Garment colors separate, but the broad tan vest panels, dark waist seam, small hands and dark uniform trouser texture hide their intended folds and parts. The lock grain and individual curls do not read at game scale. |
| Grounding | 3/5 | Idle feet remain planted, and aim/get-up keep a coherent figure. The boot-cuff transitions and narrow hand shapes remain visibly simplified. No new exposed waist gap is proven. |
| Scene consistency | 3/5 | High and Performance show the same silhouette, color placement and action defects. |
| Frame cost | Unmeasured | Forty-four visual captures do not measure the required twelve-fighter frame budget. |

Five remaining likeness gaps, in priority order:

1. Hair still forms a smooth cap in the actual game. Wider root-to-tip locks pass structural coverage and UV tests, but their separate curl silhouettes vanish at the reviewed camera size; the head and face remain small and plain beside the reference.
2. The front vest, pockets and scarf are rigid tan slabs. The reference has thin open fronts, overlapping cloth, rolled scarf folds and asymmetrical hanging gear with clear shadow breaks.
3. Side and rear clothing lack depth. A flat vest/pack edge and a clean triangular back drape replace the layered scarf, straps, fabric and compact equipment in the reference.
4. Trousers have the corrected stance but remain smooth vertical masses under mottled paint. The reference has loose asymmetric cargo pockets, knee volume and gathered cuffs; the model shows small horizontal cuff tabs instead.
5. Boots and gloves are simple blocks at game scale. Boot shafts, separate toe/sole and fingertips are present in source yet weak in the actual views.

The Director independently scored the same round 3/3/3/3, frame unmeasured. The Director also found the new locks visible but still part of a broad planar cap; the triangular scarf, blocky vest bags, flat side/back torso, repeated trouser cloth, ring cuffs and simple hands/boots remain below the likeness gate. Neither review found a new open body gap.

Independent tests support the bounded technical result: the new lock projection/root/native contour source checks pass 3/3; exported root-to-tip padded UV islands pass 1/1; frontal and four-view scalp coverage, synthetic hair-chart paint isolation, face UV spacing and truthful triangle counts pass 5/5. Projected lock surface raised at least 8 mm above the cap grew from round 9 to round 10 by view: front 9.6%→28.7%, back 6.7%→28.7%, left side 0.5%→44.4%, right side 12.7%→33.1%. The painted and structural exports have byte-identical near/far geometry, UVs, skinning and twelve animation tracks; all three 1024×1024 maps are embedded exactly. The candidate is 7,500 near / 1,833 far triangles. These facts do not establish likeness 4 or frame cost.

**Next method:** Keep the current reviewed runtime Rook and open a separate Rook-only body follow-up. Start from a hand-shaped high-detail head/hair and tailored layered garment sculpt, then retopologize and bake it into the existing budgets. Judge a matched game-scale front/profile/back silhouette before building more detail or converting any of the other seven crew. Preserve the current proven rig, save isolation and baseline asset hashes. I recommend withholding broad first-person hand conversion until the body likeness gate passes; a separately scoped Rook-only hand research proof can test the topology and UV lessons without claiming this body method won.
