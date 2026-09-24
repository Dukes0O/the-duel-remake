# Crew fidelity round 1: independent review

Evidence: f88494e; authored assets: 89fe313. Reviewed both original crew
sheets, the contact sheet, full-size crew captures, eleven Rook action poses
and the frame measurements. This is below fidelity approval; no beta claim.

Outfit identity and surface detail improve on the GFX-00 prototype, but
shape, faces, texture seams and movement remain visibly unfinished.

| Crew | Likeness | Readability | Grounding | Scene consistency | Cost |
| --- | --- | --- | --- | --- | --- |
| Rook | 2 | 3 | 3 | 3 | 4 |
| Nell | 2 | 3 | 3 | 3 | 4 |
| Jax | 2 | 3 | 3 | 3 | 4 |
| Odessa | 2 | 3 | 3 | 3 | 4 |
| Cinder | 2 | 3 | 3 | 3 | 4 |
| Dune | 2 | 3 | 3 | 3 | 4 |
| Wren | 1 | 2 | 3 | 2 | 4 |
| Tusk | 2 | 4 | 3 | 3 | 4 |

Readability is a still-image judgment, not measured at racing speed. Neutral
staging does not establish consistency with the course. Cost reflects twelve
color draws and 61,044 near triangles: High CPU median/p95 2.7/3 ms and
Performance 1.5/2 ms, forty samples each. No GPU timing or complete combat
frame-budget claim follows from those measurements.

## Five biggest differences and next fixes

1. Broad texture projection puts grey/cream background strips on limbs and
   boots. Wren's front shows a second side-profile face; Dune's hood opening
   splits the face. Use separate body-part texture regions. Tusk's reference
   profile faces left, contrary to the script's all-right-facing assumption.
2. Square shoulders, separate cylindrical arms, narrow straight lower legs
   and wedge boots resemble mannequins. Shape sloping shoulders, tapered
   arms/elbows, fuller thighs/calves, bent knees and realistic footwear.
3. Identity needs geometry: natural hair and facial planes, a cloth hood,
   flexible Jax coat panels and layered Tusk armor instead of rounded lumps.
   Rook's hair resembles horns; Odessa's hair and trousers are blocky.
4. Motion needs weight: support-knee bend, heel/toe roll and pelvis movement.
   Prone and recovery look folded or suspended. Tool actions share similar
   raised hands; enter/exit look like a standing knee lift. Coordinate the
   torso, shoulders and hands and plant prone poses against the ground.
5. Add cloth/leather/metal roughness differences within the permitted atlas.
   Restore contact shadows and match exposure; game lighting hides some of
   the Blender material detail. Measure a real course view next round.

## Action evidence

Walk/sprint score 3 for readability, 2 grounding and 3 consistency. Jump
scores 1/2/3; knockdown/get-up and enter/exit 2/2/3; tool actions 2/3/3.
Their likeness/cost remain 2/4, with the cost limitations above.

The jump image cuts off the head and upper torso. Round 2 needs an appropriate
action camera shared by both qualities, plus side views of prone/recovery
to show contact. Keep this round unchanged rather than replacing its images.

The separate code review found absolute jump time, truncated action windows,
frame-dependent recovery timestamps and per-frame presentation allocations.
Six independent red checks in 08c747d cover those corrections. They will be
fixed without changing gameplay timings before round 2 is captured.

Verdict: continue to round 2, prioritizing faces/texture mapping, anatomy and
grounded action poses. Three completed rounds alone will not establish beta.
