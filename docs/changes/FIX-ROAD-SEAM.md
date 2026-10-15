# FIX-ROAD-SEAM

## Settled source contract

This prerequisite fixes the recorded closing-strip and escape-lining faults without copying Harbour's parked radius-10 change. Harbour alone opts into completeTerrainRibbon; its final clamped terrain row and the grounding sampler's matching closing cell cover any fractional length. Existing ridge behavior, all unopted geometry and far-grid omission remain exact. No analytic fallback is added.

Harbour's wall specification opts only Casino Corner and Lantern Hairpin into the existing physical 3 m tight-turn segmentation and centre-based escape-opening admission. Other spans and default layouts stay exact. Generated escape concrete walls, catch fences and tyre rows retain their literal world x/z in a validated, copied and frozen worldPosition. The loader uses that position for its actual transform and original nine ground samples while preserving s/lateral/chunks/yaw and full triangle clearance. No physical wall or driver changes.

## Changed assertion operands

Existing barrier and footprint reports read validated worldPosition x/z when present and retain their exact prior groundAt fallback for unpinned rows. This follows the rendered representation instead of its lossy nearest-road reconstruction. Every row, reach calculation, strict 1.5 m wall distance, nine footprint samples, float/sink bound and triangle check remains required. The kit footprint report also uses the actual transformed base x/z for pinned rows while preserving its old unpinned sampling operand. Its original three witnesses remain, with one actual pinned row per escape-lining ID appended. Additive tests are authored first; none has run yet.

## Checks

Source preparation only. Prior read-only diagnosis compared radius 10 at c8cf8f53 with radius 9 at integration 3a402766, seed 1989: maximum barrier gaps 2.6343620255883717 versus 1.327588148816081 m; three versus zero missing terrain anchors. The radius-10 gantry, garage and stand fall after s 4068 in the omitted final 3.6582195463734 m strip. Both feature snapshots stayed unchanged. This is diagnosis, not this card's acceptance. Review, required checks and an actual reviewed Harbour-only scene update remain pending; no capture or signature regeneration occurs here.

## Removed

Remove Harbour's omitted final ribbon cell and its escape-lining nearest-road reconstruction only when the new explicit options are enabled. Default layouts, physical walls, course radius, assets, old assertions and tolerances are retained.


## Source preparation

The owned source now uses completeTerrainRibbon === true only for the extra terrain row/cell; old ridge completion and unopted defaults remain unchanged. Harbour still authors radius 9, so the separate radius-10 card is not copied. alignEscapeTurns names exactly Casino Corner and Lantern Hairpin. World positions validate the three lining IDs, finite coordinates and the existing escape clearance envelope, then copy/freeze x/z; clearance still checks actual transformed triangles. Additive cases cover fractional actual Harbour scripts, prior sampled-row identity, unopted and ridge buffer identity, actual escape metadata/physical-wall identity, option defaults/malformed names, immutable/malformed pins, real-pose consumption and pinned-road rejection. Source has not executed, so no RED/GREEN, asset capture, gate/build or scene acceptance is claimed.


## Reviewed measured scene and focused checks

Independent source review clear on de6ea032; normal current-integration union9ea6f6c5 is conflict-free. Existing ground/barrier suite passed22/22, exit0, wall17307.231ms. Original Harbour native passed High/Performance8images/private41094/memory-only in115437.7794ms, issues/warnings empty; legacy frame timing explicitly off. Root reviewed actual start/Old Town pictures and the bounded geometry change: final closing strip plus escape lining alignment/pins, no physical wall or ordinary course change. No complete driving/official-frame acceptance is inferred.

The original world capture finished exit0 in20477.4781ms, with all19other scene rows exact. Only Harbour changes e5478941.. to0bbb5b9f4ec5dd6b7337db58e58df113c53f18053bca2555d8ca00779201a739; counts remain1122nodes/1105meshes/223087instances/228geometries/61materials/18textures. Update only that reviewed own fixture. Canonical nearby/jobs4/build are pending on this final fixture; no release or push.
