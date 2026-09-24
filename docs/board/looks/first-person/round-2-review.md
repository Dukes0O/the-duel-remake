# First-person round 2: independent review

Director review of assets and captured source `7cc267b`, evidence `752416a`.
Compared the complete crew/tool sheet with round 1 and the original references.
Inspected larger High Rook idle/reload, Performance Odessa wrench/repair,
and actual course aim/repair captures. Both quality settings are represented.

| Item | Resemblance | Readability | Grounding/contact | Scene consistency | Frame cost |
| --- | --- | --- | --- | --- | --- |
| All eight crews' hands and sleeves | 3 | 3 | 3 | 3 | 4, limited scope |
| RPG | 3 | 3 | 3 | 3 | 4, limited scope |
| Wrench | 3 | 3 | 3 | 3 | 4, limited scope |

Forearms now have useful volume and crew-specific cuffs or wraps. The RPG
bore is recessed instead of a radial cap. Wrench steel and yellow paint are
more distinct, with a clearer adjusting rack. The added action samples show
the hand returning toward the launcher and the wrench turning with the wrist.
Resemblance improves from 2 to 3; this remains below beta's required 4.

## Five priorities for round 3

1. Shape the long mitten-like gloves into anatomical palms, knuckles and bent
   fingers. Improve thumb joints/pads and match each reference's glove coverage.
2. Break up smooth pipe-like sleeves and pale ring cuffs with asymmetric folds,
   hems, seams and crew-specific wear. Preserve the geometry budget.
3. Refine the wrench's rectangular shaft and block-like jaw into the reference's
   contoured steel throat, bevels and worn edges against chipped yellow paint.
4. Make RPG fittings readable in game lighting through localized edge wear,
   rivets and steel/leather separation. Do not compensate with a global glow.
5. Keep fingers supporting the rocket during reload and the wrench during
   repair. Check both retained action phases for grip sliding or separation.

## Evidence and limits

46 matched PNGs, 10 durable input-action PNGs, and a 27-row contact sheet now
include weapon references. Pose differences are explicitly labelled. No
browser warnings or errors occurred on private port 47865 with memory-only
storage. Prior-round evidence remains unchanged.

The largest hands and loaded RPG use 7,340 triangles and three draws. Each
quality's 120-frame sample shows p95 18.1 ms hidden versus 18.2 ms visible,
with no frame over 33 ms. This measures added held rendering with the same
stopped course and pose updates, not total CPU overhead or worst-case combat.

The actual-input repair screenshot retains an earlier RPG/reload HUD label,
and the aim screenshot shows an earlier race time. Manual fixture advancement
may leave the HUD behind the rendered state. This is an evidence limitation,
not a proven production HUD defect. The capture author will synchronize the
existing UI update hook for round 3 without changing game behavior.

Stills demonstrate these phases, not continuous animation quality. Neutral
game views remain darker than the course views, so both informed this review.
