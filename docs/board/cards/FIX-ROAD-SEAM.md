# FIX-ROAD-SEAM

The short board entry controls current state, ownership, dependencies and locks.

Claude, 14 October 2026, from P4-FINISH-1014. Where a circuit's road closes
on itself, some total lengths leave a thin strip with no drawn ground; Harbour
only passed at 4068.8 m, so its last straight was set to 63 m to land there.
Find why the seam depends on length and make it close at any length. Also:
kit barrier pieces beside Harbour's hairpin escape road sit up to 1.3 m off
their wall boxes.


## Director implementation scope — prerequisite for Harbour and Avalanche

Own the new fix-road-seam lane only. One reusable completeTerrainRibbon opt-in on Harbour closes its near-ground ribbon at any fractional circuit length: append the final clamped row in src/world-surfaces.js and the identical actual-triangle closing cell in src/rendered-ground.js. Existing ridgeLandform behaviour and every prior row stay exact; unopted course geometry, far-grid omission and physics remain unchanged. Own only this flag and the named wall specification in src/circuits/harbour-lights.js; do not copy the pending radius10 design into this separate card.

In src/circuit-kit-layout.js, Harbour's two named escape turns opt into the same original physical tight-turn3m segmentation and opening admission as their collision walls; preserve nonescape spans/defaults and every physical wall. Preserve literal worldOf x/z for the generated escape linings in a narrow validated worldPosition field. In src/track-kits.js normalize/freeze that exact optional field and consume it only for actual placement/ground anchor and its original nine ground samples; s/lateral/chunk/heading/clearance/ownership/lifetime contracts remain. No collision or driver change, analytical ground fallback or broad-phase exemption.

Use existing tools/test-circuit-ground.mjs, test-circuit-barriers.mjs and test-track-kits.mjs only. Add meaningful actual closing-triangle/fractional-length cases first. Where the existing barrier/footprint report previously reconstructed a row centre, read the now-validated actual worldPosition x/z when present, keeping exact old fallback for unpinned rows and all reach/all-row/strict1.5m/triangle predicates. Record each representation operand change for independent review; no assertion removal or tolerance change. No new harness.

Source freeze and Root review precede any execution; all jobs are scheduled by Root. Original nearby/jobs4/build and actual reviewed Harbour-only scene fixture update are required. Root records actual visual difference before any signature regeneration; other scene rows remain exact. No frame, release, push, live port or real storage. Stop any one diagnosis at30minutes and report actual facts.


## Director atomic acceptance reslice

The reviewed source9ea6 passes22ground/barrier cases and8native Harbour views; its measured capture changes only Harbour,19other scenes exact. Original radius9 still fails the separate road-contact guard, while accepted radius10 exposes this seam/alignment fault. They therefore form one atomic correction. Root will merge the already reviewed qa-harbour-clearance branch normally into this lane, preserving both real histories and exact radius/reference/12..35mph assertions. No builder copies or guesses geometry. Only the overlapping own Harbour scene fixture must be recaptured on the combined reviewed source; do not choose either stale fixture. One canonical nearby/jobs4/build on that combined freeze covers both cards and any actual conflict resolution. Both complete in the same integration merge, then Avalanche gates once on that source. No intermediate broken-source merge, assertion waiver or new lane.
