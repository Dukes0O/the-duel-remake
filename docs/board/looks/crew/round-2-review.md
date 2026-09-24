# Crew fidelity round 2: independent review

Evidence: eac8dcd; authored assets: 53e32ee. The independent critic reviewed
the crew references, contact sheet, full-size captures and action evidence.
This round improves surface alignment and scene lighting, but remains below
fidelity approval. Three completed rounds alone will not establish beta.

| Crew | Likeness | Readability | Standing grounding | Scene consistency | Cost |
| --- | --- | --- | --- | --- | --- |
| Rook | 3 | 3 | 3 | 4 | 4 |
| Nell | 2 | 3 | 3 | 4 | 4 |
| Jax | 2 | 3 | 3 | 4 | 4 |
| Odessa | 2 | 3 | 3 | 4 | 4 |
| Cinder | 2 | 3 | 3 | 4 | 4 |
| Dune | 2 | 3 | 3 | 4 | 4 |
| Wren | 2 | 3 | 3 | 4 | 4 |
| Tusk | 3 | 4 | 3 | 4 | 4 |

Rook and Tusk likeness rose from 2 to 3; Wren rose from 1 to 2 and its
duplicate face is gone. Other visible improvements remain within their
integer scores. Two consecutive stagnant rounds have not yet occurred.

## Five biggest differences and round 3 priorities

1. Recovery needs support contact. Prone Rook's torso floats above the floor;
   getting up resembles a straight diagonal body instead of planted hands,
   a knee underneath and a transfer of weight before standing. Fix the
   authored animation, not a runtime offset or camera compensation.
2. Heads need individual shapes. Nell's face and curls lack identity;
   Odessa and Cinder have long narrow faces and clumped hair; Wren's hair
   resembles a pointed cap. Rook's hair is too upright, and Tusk's head is
   too small beside his shoulder armor.
3. Use masked, padded texture regions for individual body parts. Pale strips
   remain on Nell's forearm and boots, Odessa's boot and opposite forearm,
   Dune's thigh and Wren's boots. Tusk's profile has horizontal texture bands.
4. Give signature clothes their own shape: flexible coat panels and folds
   for Jax, draped cloth around Dune's hood, and curved plates over Tusk's
   shoulders. Several upper arms still resemble broad cylinders.
5. Coordinate hands, torso and support legs for tool and car actions.
   Standing poses also need stronger sole contact and weight shift.

## Actions and capture corrections

| Action | Readability | Grounding |
| --- | --- | --- |
| Walk and sprint | 3 | 3 |
| Jump | 3 | 3 |
| Knockdown and get up | 2 | 2 |
| Aim, fire, reload and repair | 2 | 3 |
| Enter and exit | 2 | 2 |

Round 2 fixed the cropped jump, but the side knockdown capture clips Rook's
head at the left edge. Round 3 needs a centered, wider action view. Tusk's
reference and model profiles still face opposite directions on the contact
sheet; match the view explicitly. Keep round 2 evidence unchanged.

## Measurements and limits

The private browser run captured 76 PNGs and two WebMs with zero warnings or
errors. Twelve fighters use 12 color draws and 65,716 near triangles.
The real-course comparison used 120 RAF samples for one local fighter and
twelve staged fighters: High p95 was 18.2/18.2 ms and Performance 18.2/18.1 ms,
with no frames above 33 ms. This is one controlled course scene, not a
worst-case combat or GPU timing claim.

The critic decoded six timestamped frames from each WebM, from 0.2 to 1.7
seconds, confirming movement through the course and changing poses. This
does not certify continuous playback, foot sliding or all action timing.
Readability scores remain image judgments rather than a racing-speed study.

Commit eac8dcd marks WebM as binary and restores both stored files to their
retained original bytes. Earlier text normalization corrupted the blobs;
no new capture or change to measured results was needed.

Verdict: continue to round 3. Prioritize supported recovery, individual heads,
clean texture regions and clothing shape. Keep the family in dev.
