# GFX-00 round 1 independent visual review

Reviewed candidate `ac722a8` on 23 September 2026 PDT. The contact sheet and
provenance are acceptable pipeline evidence. This is not crew fidelity approval.

The critic viewed the full sheet, JSON, capture manifest, original crew
reference, High idle front/walk side/knockdown side, Performance walk back,
and Blender walk side/knockdown side at full size.

| View | Resemblance | Readability | Grounding | Scene consistency | Cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| Idle front / side / back | 2 | 4 | 3 | 3 | 4 |
| Walk front / back | 2 | 3 | 2 | 3 | 4 |
| Walk side | 2 | 4 | 2 | 3 | 4 |
| Knockdown front / back | 2 | 2 | 2 | 3 | 4 |
| Knockdown side | 2 | 3 | 2 | 3 | 4 |

Scores apply to both game quality columns. Readability is a still-image
estimate; racing-speed readability is unmeasured. Neutral staging does not
prove course consistency. Cost covers geometry and draw counts, not frame time.
Materials/lighting score 2. Motion provisionally scores 2; timing needs motion
evidence. Road, HUD and rival obstruction are not shown by these shots.

## Five differences to fix in GFX-01

1. Shape natural shoulders, torso, knees and footwear; current forms are boxy.
2. Replace rounded chest pouches and back shell with tailored vest panels,
   straps, rectangular pockets and layered scarf folds.
3. Refine facial planes and break up the helmet-like hair and solid beard.
4. Add fabric, leather, seams, faded edges and local grime. Match exposure;
   the game clothing is substantially darker than the Blender render.
5. Give walking a bent support knee and heel/toe roll. Settle the prone torso
   onto the ground and strengthen contact shadows. A single lowest vertex
   touching the floor does not make the body appear to carry weight.

## Pipeline result

All nine views/poses are present and fully framed. Blender and game
silhouettes match. Walk and knockdown differ visibly from idle. Labels and
provenance identify cameras, times, paths, asset hash, commit and counts.
Repeating standing references beside motion poses is disclosed. No earlier
round exists for an improvement comparison. No image/export blocker found.

Independent code review separately requires deterministic movement state,
reused renderer storage and portable capture paths before this card merges.
