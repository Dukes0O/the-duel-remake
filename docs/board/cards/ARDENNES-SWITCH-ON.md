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


## Kyle directs Ardennes on after restarting, 15 October afternoon

Kyle: I restarted; let's get Ardennes on; away about3hours; please keep going. This authorizes the switch-on implementation and subsequent release/install when its remaining checks are satisfied, superseding the earlier preparation-only boundary. The prior explicit timing skip is retained as SKIPPED, not converted to a pass or silently retried. LongLeft is merged and the accepted round4 art is the candidate; no further art edit is requested. Claude's finishing verdict remains a release prerequisite and is requested on P4-ARDENNES.

Root creates one new Ardennes switch lane (actual folder ardennes-switch-on/codex/ardennes-switch-on) from current integration. Initial phase leases circuit-registry only for the exact manifest and existing admission/state tests. SUMMIT-SWITCH-ON is actively using world-signatures: do not edit shared composition tooling, capture or baseline until its owner releases that lock. Then claim world-signatures and add only Ardennes' actual accepted scene baseline, preserving every other fixture. Finishing is checked before merge/install; the board implementation dependency is P4-ARDENNES so the explicit current switch request can be prepared while that verdict arrives. No other flags, art, assets, physics, roster, save schema or prices change.


## Per-course baseline scope, before capture

FAC04 already split signatures into per-course files. Current existing --capture-new=ardennes-forest safely captures this known disabled dev scene before its first baseline, checks every existing scene, and loads actual Ardennes beech kits. No shared composition-tool or global count edit is needed. Therefore this card can use that existing read-only recipe and write only its owned tools/fixtures/world-signatures/ardennes-forest.json while holding circuit-registry; Summit keeps exclusive ownership of its shared composition-tool changes and its own scene files. Never edit that shared file or a foreign fixture here. Capture the actual current accepted dev scene first, then flip only Ardennes state and compare it in the ordinary strict suite. All old files must hash exactly as before. This replaces the unnecessary broad world-signatures lease for a course-owned initial file.


## Current source and queued gate

Frozen c2826ec8: only manifest state changes; selected production/admission tests pass2/2 after failing2/2 first; feature flags91 and ordinary strict composition43checks pass; build7598.37ms. Actual first scene hash46f792e1d00d444a4aa39f82d9ed48fbc5e009fe207bafdf0afeb97c0ad8e930,1109nodes/1050meshes/35282instances. Every old fixture remains byte-identical. Initial lane admission was cancelled immediately after the inventory showed three other heavy roots; lane.json is empty and the process drained, so INTERRUPTED/UNRUN, not pass. The next actual free heavy slot is requested for Ardennes' complete jobs4 gate; enforce existing inspectNightProcesses count<3 before launching. No foreign job was stopped.


## Review correction: first course-owned replay, before code

Independent review of c2826ec8 found enabled-course replay coverage missing Ardennes (21 enabled,20 covered). Own tools/replays/courses/ardennes-forest.json only for its first actual seeded input fingerprint at30/60/144FPS. Use the unchanged replay() and recorded inputs from tools/test-replays.mjs, with a temporary recipe under .qa-dist that writes only this new file; no existing replay file, assertion, input, tolerance or runner changes. Capture all three actual cadences and require exact equality. Preserve all previous fixture bytes, then let the unchanged full replay guard verify the union in the final lane gate. This corrects a real review fault before gate/review confirmation; no runtime physics or driver change.


## Corrected source admitted

Frozen0b5dca64 adds only actual Ardennes replay to c2826ec8. All30/60/144 fingerprints5f4ddce78ee29bae253078214880854056aadca08b4ca2f6faab51d403dcb7d2; all old fixture bytes exact. Independent same ardennes_release_review confirms CLEAR, catalog21/21and23cases. Actual final build PASS4953.1161ms. After reserved capacity opened, exactly one complete canonical lane/jobs4 started on this source (local lane-complete log/JSON); result pending, not green. Original interrupted empty lane.json remains distinct. Claude finishing requested, timing SKIPPED and release checks/install separate.


## First canonical result and exact stale-order correction scope

Exact0b5dca64 completed37/40/no unrun, jobs4,387217.6122ms, exit1. Failed only test-circuit-layouts, test-circuit-panorama-registry and test-release-tremblant: old Panorama-last and dev-QA-appends-after-all-on expectations conflict with the unchanged manifest release ordering when Ardennes is on. All other37passed, including replay/world/driver assertions. Original complete result retained; no unchanged rerun. Bounded correction starts00:10UTC, stop unresolved diagnosis by00:40UTC.

Root circuit-registry lease now owns only those3existing test files plus own note to correct the proved release-catalog premises. Keep exact original16event prefix, four earlier released positions/IDs/prices/wallet isolation and all geometry/closed-loop/clearance guards. Preserve the exact Panorama-last behavior in an explicit historical release catalog (later flags held dev), while current production/QA expectations use exact manifest order rather than moving the requested dev course after later released courses. No source manifest/order/price/scene/physics/tolerance change or global pin regeneration. Current test files in Summit lane had no pending edits when inspected; Summit may reuse this reviewed narrow correction rather than duplicating these3files. Other Summit-specific hooks remain its owner's. One independent correction confirmation and fresh canonical/jobs4/build on final source before merge.


## Reviewed ordering correction available

Finalsource cb658b7015d28a287a9da57999b2f6b7f36d1012 corrects only the three scoped tests and own note. Focused registry/Panorama cases and286releasechecks including13old-save fixtures pass; same independent ardennes_release_review confirms CLEAR. Panorama index19, old4course prefix, historicalQA/production catalogs and every geometry/access/price/save threshold retained. Summit owner can reuse this exact correction rather than duplicating those3files. Final production build passes; complete fresh canonical/jobs4 gate now running, not yet green. The preceding npm.cmd spawn EINVAL launched no build; corrected ComSpec npm run build completed normally. Timing remains SKIPPED; finishing/release separate.
