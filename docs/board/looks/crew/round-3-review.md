# Crew fidelity round 3: independent review

Evidence: c603646; authored assets: 98fb529. Reviewed both references, the
prior reviews, actual High/Performance fronts, High backs and profiles,
recovery phases, action stills, course images and recorded measurements.
The three-round card has valid evidence. Keep the family in dev: likeness
and several other categories remain below the required four.

| Crew | Likeness | Readability | Standing grounding | Scene | Cost |
| --- | --- | --- | --- | --- | --- |
| Rook | 3 | 3 | 3 | 4 | 4 |
| Nell | 2 | 3 | 3 | 4 | 4 |
| Jax | 2 | 3 | 3 | 4 | 4 |
| Odessa | 2 | 3 | 3 | 4 | 4 |
| Cinder | 2 | 3 | 3 | 4 | 4 |
| Dune | 2 | 3 | 3 | 4 | 4 |
| Wren | 2 | 3 | 3 | 4 | 4 |
| Tusk | 3 | 4 | 3 | 4 | 4 |

## Five priorities for the next crew polish wave

1. Join heads to necks. Odessa, Cinder and Nell visibly have gaps below the
   head in both qualities. The exporter scales head height around 1.68 while
   the neck ends at 1.56. Blend the neck into each adjusted jaw and check
   animated poses; this is a concrete geometry defect, not finished art.
2. Replace projected texture bands with authored body-part UV islands.
   Nell's forearm, Odessa's boots and forearm, and Dune's thigh retain pale
   streaks. Profiles show strong horizontal smearing, especially Tusk.
   Bake padded cloth, skin and metal regions instead of stretching the views.
3. Build individual facial and hair shapes. Shorter heads improve proportions
   but remain rounded masks with protruding facial pieces. Odessa's hair
   resembles separate lumps, Nell lacks the reference curls, and Wren lacks
   the irregular layered hairstyle.
4. Improve anatomy and clothing silhouettes. Broad cylindrical shoulders,
   detached arm contours and oversized wrapped boots dominate. Jax's coat
   is improved but stiff; Dune's side hood resembles a rectangular shell;
   Tusk's curved armor still reads as a striped shelf.
5. Author tool and car actions around actual contact points. Aim, fire and
   reload remain similar raised-hand poses; enter and exit resemble standing
   leg lifts. Use weapon grips, car sill/seat positions and planted feet.

Nell, Jax, Odessa, Cinder and Dune have unchanged likeness scores through two
consecutive rounds. SPEC 0.3 now requires a changed approach: continuous
anatomical meshes and authored UV/baked textures, rather than further
primitive proportions and projection adjustments. Record that work as a
follow-up card; completing three rounds does not waive the fidelity gate.

## Action progress

The side knockdown view is centered and no longer clips the head. Recovery
phase .08 is prone, .48 shows a folded support knee and planted forward foot,
and .80 is upright. Recovery readability/grounding improves from 2/2 to 3/3.
Walk/sprint and jump score 3/3, tool actions 2/3, and enter/exit 2/2.
Tusk's profile now faces left to match the reference.

## Cost and limits

The controlled scene uses 12 draws and 66,340 near triangles. Per-asset near
counts are 4,876 to 6,108, with 1,880 distant triangles. Course baseline/crowd
p95 is 18.2/18.2 ms High and 18.1/18.2 ms Performance, with zero frames over
33 ms. These samples support the budget for this scene.

The review used still images and recorded measurements. The reviewer did
not decode this round's WebMs or certify continuous foot sliding, racing-speed
readability, GPU cost or worst-case combat performance. No runtime, loading
or animation integrity blocker was identified by the completed code and
focused checks; the visual defects above remain explicit development debt.
