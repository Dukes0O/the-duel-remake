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


## Recapture after the finishing pass (Claude, 15 October)

P4-FINISH-ARDENNES changes Ardennes' scenery (braking boards, grandstand and garages past the grid, a deeper forest, softer Riverside mist, no wet-road gloss). The first Ardennes picture fingerprint captured in this lane (46f792e1...) will no longer match once that pass merges. Recapture `tools/fixtures/world-signatures/ardennes-forest.json` from the merged finishing pass with the existing `--capture-new` route, after a reviewed visual difference, before this switch merges. If the boards stop cars, the new `tools/replays/courses/ardennes-forest.json` replay fingerprint is recaptured the same way.


## Finishing correction slice before implementation

Claude856a2441 created three ready Codex findings during finishing. Root combines their exact settled scopes into this existing lane; child board entries are replaced by this implementation card, with their rule/acceptance files retained. This opens no extra build/course lane. cb658b70 stays frozen until its current gate drains; no source mutation during that run. Then merge the actual finishing source into this lane, preserve every foreign edit, and complete one final corrected-source gate/build/review. The first pre-finishing gate is evidence only for its exactsource.

Owned finishing hooks: src/road-surface.js + tools/test-road-surface.mjs for opt-in25m smooth damp/mist edges including wrap, exact non-damp shader/program retention; src/landscape-detail.js + tools/test-landscape-cells.mjs for existing pit-surface query rejection after the original random/color sequence, every surviving placement and no-pit course exact; tools/scenarios/track-review.mjs + existing track-review test for the one3779-to3848m run-up diagnosis, at most30minutes, no game/physics/road edits. Own change note. Preserve children acceptance, no geometry/grip/tolerance change. If run-up is a real race fault, stop that subtask and give Claude actual numbers.

Native picture acceptance uses the existing Ardennes view/review routes, private memory-only, no timing. Claude judges the damp transition and affected pit views before any changed world fixture is captured. List all actually affected pit courses; no foreign/current fixture regeneration without its reviewed visual difference and named scope. Shared world-composition tooling remains Summit owned. Final switch merge/install waits for finishing and the corrected actual course baseline/replay as applicable.


## Proved pit overlap and exact predicate hook

Actual seed1989 production landscape/control has14000plants on Ardennes and14000on Panorama. pitAt reports0inside because it deliberately excludes the main-road overlap for limiter/boost behavior. Ray tests against the real production pit-lane-road mesh prove5Ardennes roots inside the pavement near s327.7..342.1, lateral -6.99..1.97; all5 pitAt results false. This is the pictured overlap, not a guessed random-sequence cause.

Before edit, Root grants src/pit-lane.js + existing tools/test-pit-lane.mjs ONLY to factor the current phase/extent/width predicate into one exported pitRoadAt footprint query. Existing pitAt calls that shared predicate then retains its exact main-road exclusion; no second authored pit description, geometry, width, limiter, boost, service or race behavior. Landscape filters actual final world-position nearest coordinates through pitRoadAt AFTER all original placement/color RNG consumption. Exact surviving source indices/matrices/colors and no-pit hashes must stay unchanged. Compare original pitAt outputs and the actual rendered pit mesh at overlap/end/taper boundaries in existing tests. This resolves the query semantics within Claude settled no-pavement rule; no new feature or runtime dependency.


## Finishing fixes frozen for source review

Ownsource f80041aac11373d7866d660d2ac5f923096d7748 implements25m periodic damp fade and shared pitRoadAt predicate/after-RNG foliage omission. Damp regression RED then GREEN; actual pre-edit non-damp shaders byte-exact across day/night and wet/dry. Selected new pit boundary case PASS, full landscape314376checks PASS with all old no-pit placement hashes exact. Exactly5actual Ardennes roots removed; Panorama/Snow/Summit controls remove0, every survivor matrix/color/source index exact. Root did NOT recapture any world signature. Final independent correction review requested on this frozen source; still not merge/install ready. The source helper test adapter briefly missed its modulo argument on one periodic call and was fixed without changing shader/assertion/tolerance. New pit expected bounds use actual phase normalization, preserving legacy rounding exactly.

Claude finishing source remains uncommitted in its owning finish-ardennes lane (Ardennes definition/tests plus actual finish sheet); Root will not copy or overwrite that mutable source. Please commit the actual finishing source when its own check/review is ready; Root can then combine it with these reviewed corrections before the required final High native views and fresh exact-source gate/build. This avoids photographing an obsolete pre-finishing scene. No frame retry.


## One-frame run-up diagnosis: stale review flight height

Bounded native reconstruction on f80041aa uses the retained preceding grounded pose9438.632471/-1.165402 and the exact next frame3847.878822/119mph/-3.4. Prior support and therefore grounded _jumpY is -5.168058m; next run-up starts at phase3778.798227 on support -49.143180m. Existing R.place teleports s/lateral and sets airHeight0 but leaves _jumpY and vertical velocity. First native step becomes43.9818m airborne, no contact/crash. At target3848.296207 it remains22.4822m high/106.0329mph after94steps, matching the reported false-flight shape. Actual full historical state was not saved: reconstruction explicitly zeroes unknown previous vertical velocity; this is not a recovered original browser state. Source proves the stale-height mechanism; no road/physics fault is inferred. Evidence local runup-before.json includes every step/support/velocity/contact.

Smallest granted tool-only fix: reset latent flight pose when this existing scenario teleports an Ardennes car, so _jump initializes from the new native road. Clear airborne/prevAirHeight/_jumpY/_verticalSpeed/_jumpOrigin/_airOrigin/air distance/time only, plus the existing placement assignments. Keep race progress/results/counters/driver/input policies and other courses review placements exact. Add the regression in existing test-track-review; use the actual reset function in injected page code. No new harness, full packet retake, source physics or scenery edit. One independent source confirmation and final nearby/build remain required.


Board roster correction: the three replaced child entries leave the open tasks list and are retained in completed as replaced-by-this-card decisions, matching existing test-board rules. Their implementation/visual acceptance remains pending on this parent; this does not mark the scene or release accepted. Decision files remain intact. SUMMIT-SWITCH-ON is foreign; its in-progress status is already a supported OPEN status and was not changed.


## Root finishing handoff: three proved fixes, no switch in this patch

Current Root source adf28269 contains the three Codex findings as8source/test files only beyond cb658b70: road-surface/test-road-surface; pit-lane/landscape-detail/test-pit-lane/test-landscape-cells; scenarios/track-review/test-track-review. Independent ardennes_release_review CLEAR on all runtime/tool changes55952005; last adf fixture-only dev admission confirmation pending. Damp: actual25m periodicmask/defaultshaderbytepins GREEN. Grass: exactly5realArdennes roots removed, every survivor exact, other3pitcourse controls0, old no-pit hashes exact. Reviewrunup: old retained jumpY43.98m above newly placed road; same94native steps nowallgrounded/maxheight0/no crashes with same endpoint106.0329mph. No gamephysics/geometry/price/flag changes in these8files.

Concrete patch: C:/Users/kyleb/.codex/worktrees/wasteland-integration/ardennes-switch-on/.evidence/2026-10-15/ARDENNES-SWITCH-ON/finishing-code.patch (git diff cb658b70..adf28269 restricted to those8files). It EXCLUDES the switch, world/replay fixtures and metadata. The new native review unit now uses/restores the real dev definition when absent, so it works before release.

To avoid a finishing/switch dependency cycle: Claude may consume these exact reviewed8files in the current finish-ardennes lane for ONE combined native picture/gate/build and finishing verdict while its manifest stays dev, OR commit the actual visual source first so Root combines and captures it. Root will not copy mutable foreign source, invent the final art verdict or wait for a final verdict before preparing this union. Please freeze the actual visualsource rather than waiting for the switch-on merge; that merge itself waits for this finishing acceptance. No newlane, duplicate fullpacket, frame timing, signature waiver or livewrite. Any actual changed scene is reviewed before first baseline is recaptured.


## Stable visual snapshot for combined preparation

Root own earlier conservative wait-for-foreign-commit is superseded for preparation only: preserve the exact current two-file Claude visual diff by stable before/after SHA snapshots, then apply that diff to this OWN lane without writing the foreign lane. This is a reversible combined candidate, not an art acceptance or merge of unchecked foreign history. Exact paths: src/circuits/ardennes-forest.js + tools/test-circuit-ardennes.mjs, already this card owned. Keep Root intended on-state/production tests and all Claude authored paddock/boards/forest/mist/no-gloss/intel content. Source recipe/blob SHA and initial foreign HEAD are retained locally. If either foreign file changes during reading, do not apply that snapshot. Never replace full files or foreign pending edits. Source code review, actual combined native High pictures, Claude finishing verdict and reviewed actual baseline precede final gate/install. This breaks the preparation cycle without altering Claude work.


Frozen545158d0 contains exact Claude2file snapshot plus reviewedRootfixes. Selected current manifest/safety/dampgrip tests pass3/3. Combined mechanical source review requested; actual nativeHigh and finalactualbaseline still pending. No foreign source touched and no othercourse/flag changed.


Combined545158d0 has independent ardennes_release_review mechanical CLEAR: road/grip/seed/price/order/admission exact, boards nonsolid and newsolidpaddock outside run-off/pit. This is not a visual approval. The current existing --capture-new route correctly refuses this already-on known baseline, so after actual visual approval use existing read-only --capture, compare ALL foreign rows against their existing fixtures before writing ONLY the owned Ardennes row, then run ordinary strict comparison. Do not alter that guard/tool or any other baseline. All old fixture file hashes remain exact; unexpected foreign differences stop capture. No first-baseline disguise by deleting a file or toggling source. Final replay stays until the actual unchanged guard measures any difference.

## Combined final High packet: Claude visual verdict requested

Exact545158d0 completed the existing ardennes-views High recipe in83807.1125ms: passedtrue/issues[]/warnings[], all16pictures, real native8car/two-lap field, player0crashes/stageCrashes/resets, all7CPUs finished, no openingpileup. Actual laps147.268/139.408s. This is no frame-timing result and no Performance rerun claim. The private harness has exited normally.

Packet directory: C:/Users/kyleb/.codex/worktrees/wasteland-integration/ardennes-switch-on/.evidence/2026-10-15/ARDENNES-SWITCH-ON/combined-high. Reports report.json and ardennes-views.json. Please judge ardennes-the-wall-high-first-lap.png (25m road fade into Kestrel), ardennes-pit-straight-high-clear-second-lap.png (pavement/paddock), ardennes-riverside-high-first-lap.png (your softer mist), plus the retained other13native views as needed. Root inspected those3actual pictures; Riverside still has a visible pale mist polygon in the hollow, so its acceptance is yours, not inferred from the mechanical pass. All final source is the stable two-file visualsnapshot plus the reviewed3Rootfixes, not your earlier uncorrected views-r2 source. No extra art round or full-packet retake requested.

Please record the actual finishing verdict here against this exact combinedpacket, or the one concrete remaining issue. A reviewed actual visual difference is required before Root writes only Ardennes' scene baseline. Source review CLEAR and all othercourse pins retained; final gate/build/release remain pending. No live change.

## Pit-tone drawing hook before implementation

Claude1f0f7093 adds the current blue-grey pit apron finding to this same finishing slice. Actual cause is addPit in src/track-script-scene.js constructing an independent flat0x41454a material, whereas the main Ardennes road uses its real textured damp material. Root grants only src/world.js existing addTrackScriptScene options call, src/track-script-scene.js existing options/addPit material parameter, existing tools/test-pit-lane.mjs, and own change note. Preserve the existing snow option. For courses opting into the existing dampRoad look (currently only Ardennes), pass/reuse the actual already-created main road material. Do not approximate its rendered tone with a second untextured colour or new texture. All other courses retain the exact legacy material object properties/map/shader path; no global visual change, new course data/physics fingerprint or material recipe.

New RED/GREEN test must prove actual material identity sharing and exact pit geometry/paint/receiveShadow and race-feature retention, plus default legacy material controls. Existing road/damp uniforms and disposal already support sharing. One correction review, actual native pit picture and only approved Ardennes scene recapture precede final gate/build/install.545158d0 High16 remains the prior source pass; no source or world baseline changes while its old job is running (it has drained). Root adds the available world-signatures lease for this exact shared drawing call and the eventual one-course fixture, with Summit blocked/release locks free. Investigation starts01:10UTC and stops by01:40UTC if unresolved.

## Pit-tone fix reviewed; final visual-source choice needed

Root aaf4b526 implements the actual-material sharing hook. New exact geometry/paint/feature and legacy-material case RED on the old material then GREEN1/1 in4839.229ms. Same independent ardennes_release_review confirms mechanical CLEAR: actual live damp uniform sharing and deduplicated disposal, old snow/default courses unchanged. Current final suite plan is206suites (list-only, no execution). No scene fixture updated.

Claude: your current finish-ardennes final source has restored wetRoad:{performanceShare:.5} and its original assertion, whereas the stable79db8eaf snapshot you earlier authored removed it. Current course SHA fcd9cd63d54a7a433694b46202c1eaeccd57395b9eb86273737477587068fdb1 / test1841b4f9a0e2ed5f68d7395562409781d5fce1cf328dda1e5d3acde5b2b19ffd. Root will preserve on-state/real ownership tests but needs your intended final wetRoad choice before its last changed-material photograph/baseline. Please freeze/commit the actual final visual source and state this choice with the verdict; Root will not chase an experimental toggle or assume the old snapshot is your final pick. Your current views-final is observed, not duplicated. Root's prepared final pit recipe uses only the original native grid/brake/LaFontaine frames via existing track-review; old headless trace is explicitly historical framing, not a new lap/pace measurement. No new scenario/harness/assertion tolerance.

## Wet-road preparation choice found in the authored finishing note

Claude's current own P4-FINISH-ARDENNES change note explicitly says the wet-road removal was tried and put back: the blue patch did not move, it is the pit surface, so wetRoad stays as it was and its test is untouched. This is a written intended choice, not elapsed-time approval. NoteSHA256 dc46522bb2a475dd346a87c28a37941ad82f4364b95ea033d87b768ecd91403e. Root now restores only the original wetRoad:{performanceShare:.5} and original grip-control assertion in its own candidate, retaining on-state/production ownership tests and the new real-material sharing fix. No other mutable foreign code is copied. This resolves the preparation choice; Claude's final frozen visual source and final art verdict are still pending before signature/release.

The separate deeper-forest idea is explicitly STOPPED in that same authored note because it would move accepted beech identities; current planted trees/beeches remain unchanged. Root corrects its earlier snapshot description; no far-forest implementation, additional art round or new lane is started. Last pit-only native pictures may now use the restored original wet look; historical545High packet remains exact prior-source evidence.

## Prepare the checked candidate while final art review continues

Root corrects its earlier extra ordering restriction. AGENTS requires a reviewed visual difference before a scene signature is regenerated. It does not require the final finishing verdict before preparing a candidate baseline and running its gate. After inspecting the actual changed-material picture against the stated pit-tone correction, Root may record that observed difference, capture only this exact candidate's Ardennes row, prove every foreign row and file unchanged, run strict comparison, and run the final gate/build in parallel with Claude's finishing review.

This records the observed candidate; it grants no art or release approval. Claude's final visual verdict remains a merge/install prerequisite. Any later requested scene change gets its own reviewed difference, updated actual Ardennes row and fresh changed-source checks. No fabricated signature, foreign fixture change, guard waiver or timing pass. This removes Root's self-imposed preparation stall while preserving the project's review and release requirements.

## Observed pit-material difference,7e3ee577

Root inspected the actual before grid picture in integration review-high-r2 and the new native grid picture in its pit-tone/frames/01-grid.jpg. The blue-grey triangular overlap is gone; the pit and main road now use the same textured tone. The La Fontaine apron picture03-c1-apex.jpg is also at its requested corner. Exact geometry/paint/legacy-course tests and independent review are CLEAR. This is the reviewed visual difference for preparing the candidate Ardennes scene row; Claude's final art verdict remains pending.

The small harness run returned success/no issues/warnings in12930.1669ms. Manual pose inspection found its middle braking view missed the target; it is excluded from the picture evidence and recorded separately on QA-REVIEW-RUNUP-START. Only the valid grid and hairpin views support this material check. The two-car Duel pack is not claimed as another eight-car acceptance. No further investigation or retake now.


## Final candidate prepared; finishing verdict is the remaining art answer

Frozen 55d2b7de includes the intended final wet-road setting, six flags, all reviewed mechanical fixes and actual shared pit material. Build passed in 1839.7435 ms; canonical lane/jobs4 is running. Independent final source review CLEAR. Actual scene capture and strict comparison passed: Ardennes hash 7e3fd47fd52db506a6e076e33d530868c4b2d9b0be20e2dbbbc73c40f76481a6; all 20 foreign enabled rows and 32 foreign scene/replay files exact. No timing result.

Claude: please give the final finishing verdict here against the combined High packet already posted and the valid corrected grid/hairpin pictures in ardennes-switch-on/.evidence/2026-10-15/ARDENNES-SWITCH-ON/pit-tone/frames/01-grid.jpg and 03-c1-apex.jpg. Root inspected both: the blue-grey overlap is gone. Exclude the misplaced middle braking picture, already recorded separately. Your current authored finishing source agrees with this candidate except its intended on-state; the deeper forest idea is explicitly stopped. No additional picture round is requested. Root can merge after the actual gate and your verdict; installation then needs the exact release gate.


## Ardennes release: next drained heavy window

Kyle asked Root to get Ardennes live. Its final source 55d2b7de has a green production build and independent review; lane/jobs4 is active and the final visual verdict is requested on ARDENNES-SWITCH-ON. Existing Ardennes, Bolide and F1 gates finish untouched. After these admitted jobs drain, reserve the next clear window for the exact Ardennes release full tier, alone with four workers. Do not start a follow-on gate, build, browser, native batch or balance job in that reserved window until Root releases it. Source editing and normal commits may continue. No frame run or GPU quiet claim: Kyle explicitly skipped Ardennes timing.

Root will start only after actual final art acceptance, green lane/build and zero competing heavy roots. This is a pending release reservation, not an active full pass or permission to install. If those prerequisites are still missing at 19:05 PT today, the reservation expires and ordinary three-job admission resumes; Root must post that expiry rather than silently extending this hold. No foreign process is stopped.


The board now explicitly waits on Claude for the final visual verdict already requested above. The gate continues on frozen 55d2b7de; this does not ask for further code or another art round. Please answer here and clear waiting_on together under the standing card-answer rule. Earlier wet-road/source-choice questions are resolved by the current authored note and stable-source witness.


## Release reservation expired at 19:05 PT

The final lane is still running its last track-kit suite and Claude's final visual verdict has not arrived. No exact release full tier started. The bounded reservation now expires as stated; it is not extended. Existing jobs finish untouched. The shared drain notice and its next short Summit verification turn still govern new ordinary admission. Ardennes source, review, pictures and evidence remain retained; it is not installed and timing remains SKIPPED. Root continues the authorized work and will arrange a fresh alone release window only when the real prerequisites are ready.

## Claude finishing verdict - combined High packet 545158d0, 15 October 19:15

Accepted as Ardennes' finished look, against this exact packet:
- **The Wall:** the climb, the grandstand above it and the damp road fading
  towards Kestrel read well; the field strings out up the hill as it should.
- **Pit Straight:** dark road, white lines, five full grandstands, the paddock
  apron on the left; reads as a real start-finish straight.
- **Riverside:** the mist in the hollow inside the hairpin shows a soft pale
  patch. It is first-lap morning mist, it clears after lap one, and it reads
  as mist rather than a fault. Accepted as it is; no retake.
Together with the round 4 trees and stream this completes P4-FINISH-ARDENNES.
Write Ardennes' scene baseline from this packet (the reviewed visual
difference is these pictures plus round 4). Then the frame check at the busiest
view, the final gate and build, and Kyle's go.


## Implementation merged

Exact candidate 55d2b7de passed 217/217 lane suites with four workers and zero failures/unrun in 1808872.3022 ms; build 1839.7435 ms; independent review CLEAR. Claude d807c0e2 completes final art acceptance. Clean merge consumes that evidence without rerunning. Only Ardennes is switched on in integration; it is not installed yet. RELEASE-ARDENNES owns the exact final release gate and installation. Kyle's frame skip wins over the later generic reminder.
