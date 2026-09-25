# Rook P2 candidate, round 1

This is a technical trial, not a likeness or beta pass. The immutable matched sheet is `round-1.jpg` (84,126 bytes). Private memory-only browser capture on port 33439 used candidate GLB SHA-256 `82b82d97bc9c0e708261d2083262f9e3b0c8638decb5d75e70c8f437b9419a91` for 44 High and Performance shots, with zero load warnings or errors. The original runtime Rook and seven other crew assets were unchanged. The Blender rows reopen the exported candidate GLB; the game rows use the exact candidate through the private QA fetch substitution. The approved crew reference remains the comparison source.

| SPEC 0.3 item | Round-1 score | Evidence |
| --- | ---: | --- |
| Resemblance | 2/5 | Recognizable broad outfit blocks, but face/paint and hair differ strongly from the reference. |
| Readability at racing speed | 3/5 | Vest, scarf, boots and pack read; face identity and material separation do not. |
| Grounding | 3/5 | Idle feet contact the review floor; action poses still need corrected cloth binding and contact review. |
| Scene consistency | 3/5 | Muted palette fits the scene, but texture detail and wear are too plain. |
| Frame cost | Unscored | No twelve-fighter frame comparison was completed for this trial. |

Five largest differences to fix next:

1. The face has no readable eyes, beard or painted planes at the game camera distance.
2. Hair still reads as a cap with separate ribbons rather than the swept irregular mass in the reference.
3. Jacket, vest and trousers use muted procedural color with little material distinction or worn detail.
4. The aim animation pulls both vest panels toward the thighs/knees because candidate weighting mistakes garment edges for arm vertices. This is a blocking rig defect.
5. The UV layout fragments the face into 21 islands and leaves only about 1–3 pixels between visible garment islands. A single front facial island and measured 16-pixel island clearance are needed before painted maps. An initial test claimed overlapping painted texels, but Crew traced that claim to double-inverting glTF V; the corrected actual-export overlap check passes.

The next bounded changes are role-aware vest/pocket/pack weights and a unique continuous front-face UV island with adequate island spacing. Both have independent red acceptance tests before export. The neutral source geometry stays frozen. No painted texture, frame-cost score, runtime swap or promotion is approved by this round.

**Attribution correction after round 1:** The long tan panels in the aim screenshot were a real observation, but their color did not prove they were vest vertices or arm-bound. Actual exported vest, pocket, pack and strap weights already passed the torso guard. An independent test then found a separate jacket armhole seam growing from 0.006 m to 0.368 m in aim; the role-aware jacket correction removed that measured tear while preserving sleeve motion. Round 2 still shows long tan panels in aim and get-up, so that fix did not close the visual defect. The next diagnosis must identify source roles and stretched edges from the exact round-2 GLB at those poses before changing weights again. This correction retains the original failed screenshot and verdict.
