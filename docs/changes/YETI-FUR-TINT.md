# YETI-FUR-TINT

The optional fur material colour is implemented; final night appearance is not accepted yet. Existing Yeti assets, rig, clips, geometry, texture maps, vertex colours, roughness, lights, emissive values, sighting rules and saves remain unchanged.

## Implementation

createYetiView accepts optional {furTint}. Omission retains the exact shared donor materials. For an explicit tint, each High/LOD actor clones only round-two-yeti-matted-ivory materials, reusing a clone for meshes sharing that original. Other materials stay shared; material arrays are replaced only where fur changed. Distinct views/qualities have independent owned clones, disposed once with their actor. Donor materials/textures/geometry are never disposed by a view. The seated roof path remains unchanged.

The renderer supplies neutral linear RGB(1.8,1.8,1.8) as a candidate brightness lift. Actual accepted GLBs use a white diffuse factor, so a conventional pale colour below1 would darken their textured fur. This lift preserves its texture and vertex-colour variation instead of replacing them or adding emissive light. Claude must judge the actual matched night-roar pair before this colour is accepted; it is not an art verdict or a new art round.

## Verification

New focused material tests failed first on the unmodified view at the owned-clone check. After implementation30pure ownership checks pass: exact omission, fur-only colour, shared textures/geometry, untouched eyes/teeth/donor arrays/colours, per-quality sharing, independent views, idempotent owned disposal, no donor disposal and race-state immutability. The fixture is a small flat ribbon for isolating materials; original actual accepted-model slope/animation/reward/save tests remain byte-for-byte. Additional actual accepted High/LOD tint/donor checks are appended to that existing suite and remain UNRUN. All three changed source/test files parse; diff check passes.

Applicable existing checks: test-yeti, test-render-reuse, test-render-readiness, test-p4-kits, then the canonical changed lane/jobs4 and production build; reuse any exact passing coverage instead of duplicating it. Actual night-roar pair and final independent source review remain pending. No heavy job, native race, browser, audio capture, frame run, live edit or release was launched for this card. The separate QA-YETI-THREE scenario owner/file stays untouched.

## Removed

Nothing removed. This optional view-only path replaces no donor asset, original behaviour when omitted, test assertion, race rule, geometry or old review evidence.

## Approved one-shot colour recipe prepared, unrun

Claude63c54565 approved tools/scenarios/yeti-fur-tint.mjs and three matched brightnesses original/1.4/1.8. Recipe reuses the actual menu P4KitsQa page modules, memory-only native App fixture and production autopilot, freezes only after an actual sighting reaches roar, then synchronously renders the same actor/camera at all three factors. Exact race/profile, rig/pose, material properties excluding only fur colour, geometry arrays and camera/light witnesses must stay equal; original candidate and camera restore in finally. Original GLB diffuse factors and source hashes are checked. No helper Vite bundle, Three duplicate, injected seen state, audio recording, frame timing or five-phase packet. It writes three raw JPEGs/receipt and one <=500KB labelled comparison sheet with no overwrite.

Source parses/diffclean only. No QA build, browser, native drive, picture, gate/build or final colour acceptance has run for this recipe. Existing84294d30 runtime46/46/build remains historical passed evidence, not a pass for this new source. Current integration union is conflict-free. Summit exclusive full hold prevents heavy validation. Exact additional existing discovery-filter/test hook is requested on card to keep this one-shot out of daily --all; no foreign runner edit before answer. Independent recipe review pending.

Required source review found a real failure-path ordering fault: a restoration assertion could throw before restoring camera, and the colour-excluding invariant could not prove fur restoration. Fixed with inner finally for unconditional camera restore and explicit exact original colour-array equality; receipt now reports that actual check rather than a literal true. Source parses/diffclean; reviewer confirmation pending. No browser/native/art capture or heavy check during release hold.

## Approved manual discovery hook

Claude's 16 October 08:30 card answer approves these two existing hooks. The default browser discovery now excludes only the two manual names, rustwall-frame and yeti-fur-tint. Explicit discovery still includes both, so the existing runner executes a requested fur comparison normally. No ordinary scenario, quiet scheduling, recorder, threshold, wrapper delegation or runtime source changed.

The existing discovery assertion now expects those exact two excluded names; it still proves no other scenario is hidden. Added assertions require the real fur recipe to remain available explicitly, and a mocked runner case proves --all omits it while explicit selection runs and reports it normally. This is the written, reviewed scope change on the card, not a dropped scenario result or a claimed photo pass.

The actual discovery regression failed first while the fur recipe was still included in --all. After the one-name filter change, all 14 existing/new pure browser-runner tests pass in 244.1549 ms. The tests use mock builds/children and filesystem name discovery; no QA bundle, browser, native encounter, build or lane gate was launched. The prior recipe review fixes were confirmed CLEAR on 562048b6. Capture, the changed-source lane/build and Claude's colour choice remain pending under Root's admission control.

Removed: the one-shot fur picture recipe from automatic nightly discovery only. Its source and explicit/manual invocation remain available; no accepted art or evidence is replaced.


## First headless photography attempt failed before capture

On clean f532d5350f11fed617a00cc05b5893dd1b052db9, the existing jobs1 runner attempted only yeti-fur-tint with explicit DUEL_YETI_FUR_TINT_CAPTURE=1 and no headed/timing flag. Actual harness report confirms headed:false, launchMode:headless, private port17107, memoryOnlySaves:true, issues[] and warnings[]. It failed at the strict recorded-night setup guard before subscribing/driving to the roar or writing any photo. Actual source/after remain equal, exit1,22849.3555ms, started19:55:33.4925725UTC and ended19:55:56.4274734UTC. Packet: .evidence/2026-10-16/YETI-FUR-TINT/headless-f532d535-20261016T195533Z. Recipe receipt complete:false/nativeEncounterAcceptance:false/groundingAcceptance:false/colourAccepted:false; no art verdict or performance pass.

Fresh preflight had lesson30232 and rescue43576 as two heavy roots. Foreign direct heli35360 started12:55:27 while the final headless-source check was being read; own runner37864/parent37576 started12:55:33. On receiving Root's new inventory, only-own stop was attempted, but the identity guard found the run had already exited naturally. No process was stopped. Runner37864/harness3452 and the attempt's Chrome creation interval have no remaining processes; owned browser-suite-XtdXth bundle is absent after normal harness cleanup. No foreground window opened. This completed failed packet remains distinct from a capacity cancellation; no retry was launched.

A bounded source-only diagnosis found one definite recipe error: it demands course.def.timeOfDay==='night', but the accepted Summit definition has no timeOfDay field. Its native lightPath runs day/golden/dusk/night by distance, reaching terminal night at10100m. The fixed Yeti site is later on Devil's Staircase or Summit Finish. Existing scene-lighting publishes the actual rendered lightPath and nightAmount on #view3d. No native argument, seed, appearance predicate, asset or colour invariant was changed to diagnose this mismatch, and other setup predicates have not been individually witnessed.

Proposed correction for Claude's written assertion review: preserve every fixed actual fixture predicate, verify the authored terminal-night range covers the actual Yeti site at setup, and require the actual frozen-roar render's existing lightPath==='true' and numeric nightAmount===1 before the matched pictures. Do not force a light preset, mutate the encounter or drop the full-night requirement. The concrete guard correction below remains pending written review; no revised-source acceptance or second capture is claimed. Root coordinates the exact card question and admission. Investigation is bounded at13:25PT; this concrete mismatch was found before the bound.

Removed: only this attempt's owned disposable bundle/profile through existing cleanup. All failed receipts, accepted originals, current assets and the still-absent comparison sheet remain unchanged.


## Concrete night-witness correction prepared; written review still required

The owned scenario now preserves every recorded fixture check except replacing the nonexistent whole-course timeOfDay field. Setup requires the real course's distance-based lightPath to end in an actual night keyframe, with a finite nonnegative start distance no later than the actual fixed Yeti site. It records that authored range instead of claiming the start at the foot of the mountain is already night.

After naturally reaching and freezing the one real roar, the existing renderFrame supplies the actual scene-lighting DOM witness. The recipe requires #view3d.dataset.lightPath==='true' and numeric nightAmount===1 before photography and again after each of the three synchronous composer renders. It writes that actual witness into the receipt and each photo row. It does not select a different light, override a time or move the Yeti; all appearance/run/car/tyre/solo/seed, frozen-roar, same-actor/camera/geometry/nonfur/state/profile and unconditional restoration guards remain in force.

This is a concrete reviewable setup/assertion correction, not an approved retry or acceptance. Source syntax/diff inspection pass. Required independent code/material delta review is CLEAR: actual light-path terminal night is exactly1 and the existing renderer DOM witness comes from those sampled settings; no light, encounter, state or material is forced. Claude's written card assertion review under AGENTS18 is still required before any rerun, acceptance or merge. No second native job, photo, new colour verdict, threshold, fixture or runtime change has occurred. The failed headless packet remains failed.
