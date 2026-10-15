# ARDENNES-SWITCH-ON

Prepared at Kyle's request on 15 October 2026. This is the written switch-on slice, following Summit's preparation pattern. Ardennes remains switched off; no implementation, signature capture, build or release was started for this card.

## Current source and prerequisites

Accepted art is merged at010c81ad, recorded in15e28ca0. The course manifest is in src/circuits/ardennes-forest.js: state dev, flag ardennes-forest, price2000, grandPrix true, releaseOrder5, driver959-S/club/racing-line/.95. It is closed:true, so the existing closed-lap assertions in test-circuits remain applicable unchanged. Summit's open-route seam diagnosis does not justify changing Ardennes geometry or weakening those checks.

Before implementation: resolve P4-ARDENNES's Long Left test-driver crash with zero player crashes/resets on the original full-field fixture, complete the quiet Pit Straight frame check at both qualities, then Claude's P4-FINISH-ARDENNES. Kyle's later go-live is still required. A timing failure is recorded honestly and not turned into a pass by this plan.

## Future owned files and locks

Own src/circuits/ardennes-forest.js for the manifest state only; existing tools/test-circuit-ardennes.mjs and tools/test-feature-flags.mjs for precise release-state assertions where applicable; tools/test-world-composition.mjs for its exact released-course/baseline coverage; tools/fixtures/world-signatures/ardennes-forest.json for the first actual accepted-art signature; docs/changes/ARDENNES-SWITCH-ON.md. Locks: circuit-registry and world-signatures, with no concurrent owner. Name any additional hook before editing; no manual global course roster or new save field.

## Exact release flip

Change only Ardennes manifest state dev to on. Keep price2000, releaseOrder5, all original course IDs/order, road/physics/seed/driver/reference and accepted art exact. No Summit, Yeti, snow-world, other feature switch, lighting, render or material change. Preserve the closed-circuit loop assertions and every grade, clearance, ground, obstacle and save guard. The release-state tests must verify both released admission and the previous disabled behavior using the existing flag interfaces, without bypassing ownership or save rules.

There is currently no Ardennes world-signature file among the21 existing fixtures. Capture the real current accepted scene with prepared kits, using the existing capture route after the art/finishing prerequisites; never bootstrap an invented hash. Add only that row, update the exact affected coverage count, and prove every other baseline file byte-identical. Explain changed state/count assertions in the change note and independent review. A genuine failure gets bounded diagnosis; no blanket tolerance or assertion relaxation.

## Finish and release boundary

One nearby lane tier/jobs4, build and independent code review precede merge; do not rerun after a conflict-free merge. Claude prepares the later release checks on the exact final candidate. Keep this preparation unclaimed/backlog until dependencies and an allowed lane are available. It does not enable Ardennes now, start a lane, authorize live writes or restart the paused overnight continuation.

## Removed

Nothing during preparation. Future implementation replaces only the dev state and its old state/count expectation; no accepted asset, historical decision, current course baseline or save is removed.

## Mechanical preparation checkpoint

The original Long Left full-field regression is now green in retained unmerged619db9ef, with independent review, nearby42/42/jobs4 and build passed. Frame acceptance remains blocked: original headed attempt timed out without saved timing rows, and no diagnostic attempt was admitted before the bounded stop. See QA-ARDENNES-FRAME-READINESS. This preparation does not waive that prerequisite, change Ardennes dev state, or authorize go-live.


## Updated mechanical handoff, 15 October afternoon

Long Left candidate619db9ef is now merged4495c042 after42/42nearby/jobs4/build/independent review, with no conflict or repeated gate. Kyle explicitly said to skip timing because his other sessions stay active. It is recorded as SKIPPED, with no timing result or pass; do not queue or retry it during this work period. This supersedes the earlier unmerged/frame-blocked checkpoint above. Ardennes stays dev and this card remains written preparation. Claude finishing and an actual future switch-on/release remain separate; no go-live inferred.
