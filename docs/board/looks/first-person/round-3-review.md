# First-person round 3: independent review

Director review of final initial assets `14a51e3` and captured evidence
`53b9000`. Reviewed the full 27-row crew/tool sheet, larger Rook idle/reload,
Performance Odessa wrench, and the corrected actual-course repair image.
Compared both prior rounds and the original references. Runtime source is
unchanged since the independent review of `b6660c0`.

| Item | Resemblance | Readability | Grounding/contact | Scene consistency | Frame cost |
| --- | --- | --- | --- | --- | --- |
| All eight crews' hands and sleeves | 3 | 3 | 3 | 3 | 4, limited scope |
| RPG | 3 | 3 | 3 | 3 | 4, limited scope |
| Wrench | 3 | 3 | 3 | 3 | 4, limited scope |

Cloth folds and matching hems improve the sleeves. Jax and Cinder now have
full gloves. The wrench has a narrower waist; RPG fittings have local edge
detail. The improvements do not yet raise resemblance above 3. Round 2
improved from 2, so this is one round without a score increase, not two.

## Five remaining differences

1. Exposed fingertips look like small circular caps with dark pits in game
   lighting. Rework finger pads, end-cap normals and material mapping so
   they read as flesh or gloves rather than washers.
2. Palms still look like long mittens and thumbs like separate short clubs.
   Improve anatomical transitions and varied finger curvature around grips.
3. Cloth now folds, but its repeated marks and swelling remain generic.
   Match tailored seams, worn hems and each crew's clothing construction.
4. Tool profiles are recognizable but simplified. The wrench jaw/throat and
   RPG sights, barrel fittings and chipped finish need closer reference work.
   Neutral views obscure dark materials more than the real course does.
5. Grip support is better at the sampled phases. Continuous reload insertion,
   recoil recovery and repair movement still need a short motion review before
   claiming smooth animation or full contact throughout the action.

## Acceptance and limits

Three immutable fidelity rounds are complete for GFX-02's initial card.
Accept the runtime and assets for development integration after the required
lane/build gate. Keep `wasteland2` in dev; these scores do not meet beta.
Carry the five differences into the next polish wave after the ordered cards.

Round 3 retained 46 matched and 10 actual-input PNGs on private port 62795,
with memory-only storage and no browser warning or error. HUD synchronization
now passes: aim 00:01.22 with RPG ammunition 3; repair 00:03.22 with WRENCH
and REPAIRING 10/40; re-entry 00:06.87 with the car view.

The largest combination is 6,932 triangles and three draws. In each quality,
120 frame samples measured p95 18.1 ms with held materials hidden and 18.2 ms
visible; none exceeded 33 ms. This is the added rendering cost of loaded RPG
and hands on the stopped course, with pose updates retained in both cases.
It is not a GPU measurement, total presentation CPU cost or worst-case fight.

The new first-person rigs use their own 1024 texture sets. Reusing a shared
crew material set where practical remains a later resource optimization;
the measured draw/triangle budget does not establish a texture-memory budget.
