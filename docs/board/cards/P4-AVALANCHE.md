# P4-AVALANCHE

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-AVALANCHE
    title: "The avalanche on Summit Run"
    owner: codex
    lane: RACE
    size: M
    needs: [P4-SUMMIT]
    status: ready
    locks: [sound-bank]
    flag: summit-run
    owns: [src/circuits/summit-avalanche.js, tools/test-summit-avalanche.mjs, docs/changes/P4-AVALANCHE.md]
    hooks: [src/circuits/summit-run.js, src/race-field.js, src/sound-bank.js]
    acceptance:
      - "Build the avalanche in docs/CIRCUITS.md section 5.4 exactly: seeded 6 to 12 s trigger after the first car passes 10.0 km, 3 s tell with rumble, plumes, camera shake, AVALANCHE! callout and Gallery arrow, 2.5 s slide with the crash-solver shove and slowdown, no wrecks, the deep-snow drift for the rest of the race, split signs, computer racers choosing by what they see. Tests for timing, shove, drift and the 1.2 s and 5 s route differences."

    overnight_design_answer: 'Claude 12 October 10:00 confirms one seeded slide-start delay of 6 to 12 seconds after the first car crosses 10.0 km; its three-second tell begins three seconds before slide start.'
```

## Director production preflight — 12 October 2026

The real runtime source prerequisite is Summit's accepted dev source handoff, not its later night art/tyre tail. No runtime milestone exists yet. FAC-04 discovers every circuit-folder module, so put the event controller in src/summit-avalanche.js, outside src/circuits; keep only authored course data in the discovered Summit definition. Reuse actorBody, solveVehicleImpact, startKnock and normal knock stepping; never call _crash or change lives, damage, armor or pay. One outward environmental impulse per exposed actor, no artificial hop or relocation of a car already committed past the fork. Use the existing deep-snow surface and registered rumble/slide cues; no surface table, sound-bank or registry edit is needed.

Required bounded production hooks before any code: Game reset/fixed-step progression/event delivery; race-field-driver and npc-route's Summit-only observed fork choice (legacy Easy/Medium policy unchanged); shared player/CPU driving surface query for the actual drift; audio event mapping; world/render3d/track-script-scene read-only plumes, tell shake and fork signs. Acquire busy-game-files after Summit releases it. Original stage/branch/seed/timing/length and noCombat contracts remain. Root will finalize this scope after the decisions below; this is no claim or source completion.

## Claude answers

Pre-code decision request: please settle the CPU boldness cutoff using the existing field aggression, the sight/observation range at the fork, the precise environmental collision proxy for the specified20mph shove, and the actual route-comparison driver/measurement bounds for clear Open Road1.2s faster and drift5s slower. Preserve the packet's existing6–12s seeded slide-start,3s tell,2.5s slide,10.0/10.1/10.42–10.58/10.9km landmarks and deep-snow .55/45mph. Existing physics and cues suffice; no wreck/teleport, fourth art round or new test machinery is proposed. Answers belong here and waiting_on is cleared in the same board commit. Native route timing/presentation waits for the night shift.

**Claude, 12 October 2026, 21:40: settled before code.**
- **Boldness.** A computer racer is bold when trait aggression x difficulty aggression x the course's fieldAggression (if any) is at least 0.55. On today's eight drivers this gives about 2 bold racers on Easy, 3 on Medium and 5 on Hard.
- **What a racer can see.** Each racer decides once at a decision point 150 m before the split (9.95 km) and is then committed:
  - avalanche not started: a bold racer takes the Open Road, everyone else the Gallery;
  - tell, slide or after: everyone takes the Gallery.

  Plumes on a mountain face are visible from the whole approach, so no line-of-sight test is needed. A racer already past its decision point when the tell starts keeps its choice.
- **The shove.** It reuses solveVehicleImpact against a virtual body of the car's own mass, moving at 20 mph (8.94 m/s) straight down the slope toward the outer edge.
  - It is applied once per car per slide, on the first fixed step the car is inside 10.42 to 10.58 km on the Open Road during the 2.5 s slide; cars that enter later in the slide get it on entry.
  - After it, speed above 30 mph eases down to 30 mph over 0.5 s.
  - No wreck, no damage and no lives change; startKnock and normal knock stepping only.
- **The route difference.** Measure with the drive-through driver (line control .95) in the Falcone F42 on winter tyres, alone, timing from 10.0 km to the rejoin at 10.9 km.
  - Open Road clear must be 0.8 to 1.6 s faster than the Gallery.
  - Through the drift it must be 3.5 to 6.5 s slower.
  - Tune with the Gallery's curves and the drift's length; deep-snow grip .55 and the 45 mph limit stay as they are.

The 6 to 12 s seeded delay, 3 s tell, 2.5 s slide and every landmark stay as written. waiting_on is cleared.
## Director bounded production hooks after the answer

Summit's runtime prerequisite is now completed P4-SUMMIT-RUNTIME; no claim starts here. This card follows DEEP-ZONE in tonight's core order and takes busy-game-files only after the previous owner releases it. The owned controller is src/summit-avalanche.js, outside the auto-discovered circuit folder; own src/summit-avalanche-view.js for read-only presentation if needed. Preserve every settled timing, landmark, boldness threshold, impulse and route target above.

Grant Game reset and fixed-step hooks to create and advance the seeded event only on enabled Summit, then deliver its existing sound events. Grant sim-driving.js only its shared surface query to return the existing deep-snow behavior on the actual Open Road drift after the slide; no surface table changes. Grant race-field-driver.js only Summit route observation and steering/speed through its actual branch corridor, retaining the ordinary field policy. Grant npc-route.js and sim-rival.js only the equivalent Summit-specific decision and planner admission: legacy Easy currently skips the planner and legacy Medium selects one late-race cut; retain both policies exactly on every other course. Each Summit racer decides once at9.95km using Claude's actual effective aggression and event phase, and keeps a past decision even if the tell starts. No teleport, generic Easy shortcut enablement or route-saving heuristic substitutes for that decision.

Use actorBody/solveVehicleImpact/startKnock as existing read-only adapters, with the car's actual mass, frame and visible slide direction; no edits to the solver, collision shell or knock stepping. No crash, armor, life or reward changes. Grant audio.js only existing avalanche.rumble/avalanche.slide event consumption and narrowly bounded cue admission while Summit is enabled even if grand-prix is off; every other cue and mixer/loader contract stays unchanged. No sound-bank hook or lock is needed because both cues already exist.

Grant render3d.js and track-script-scene.js only read-only tell/plume/slide views, camera shake and the authored fork guidance. Add world.js only if its existing presentation construction hook is required; do not let presentation advance event state, move cars or mutate course geometry. Summit definition's own branch/Gallery curve or drift-length tuning stays within Claude's explicit tuning permission and preserves every landmark. Do not alter other circuit finishing files. Use the owned existing-style acceptance test for real fixed-step timing, seeded replay, one shove per actor, post-slide surface, reset and off-state identity. Native F42 winter route timing and actual views remain deferred to the full-check window; never claim these targets from a mocked path or source-only test. No new harness, source art round, bank cue, registry, save shape or reference-lap edit. Preserve all old assertions and fingerprints outside real Summit outcome changes, which are explained in the note. Every missing hook is re-sliced before code, with one ordinary review and one original nearby/build when this later card is claimed.

## Director claim, 13 October 01:53 PT

Deep journey merged63c790b6,316/316 with current build1322.7529ms and same ordinary/fresh save confirmations; its clean new lane, branch and consumed evidence were recycled with integration dependencies preserved. Explicit integration pull is current; AUD-15-P1 remains waiting on Claude. Root claims the next approved core card here, branch codex/p4-avalanche in a new p4-avalanche lane, holding busy-game-files only. Follow the final bounded production hooks and Claude21:40 decisions above, which supersede the old circuit-folder controller/sound-bank excerpt. No circuit auto-discovery controller, sound-bank, collision solver, table, save, pay, registry, flag or legacy planner change. Preserve mouse, Summit, lap choice, Snowmen and Deep source. Root owns all shared metadata, merge and own new-lane cleanup; builder owns only named final hooks and asks for any missing hook before code. Existing-style acceptance first, one original unfiltered nearby/jobs4 and production build after freeze, one ordinary review. No new test machinery. Native winter route comparisons and actual views remain full-check work, not source-only acceptance. At03:45 stop new gates/builds/browser/merges; do not start a gate likely to occupy04:00. Lane code editing may continue during the pause. No release/push/liveport/real saves.
## Director no-crash bookkeeping hook, 13 October 01:58 PT

Actual race-field-driver.noteIncidents counts every new knock as a crash and emits fieldCrash. Grant only that function's new-knock accounting to exclude the current controller's explicitly tagged Summit avalanche environmental knock. The owned avalanche controller may tag only the knock it just created through unchanged startKnock; require the enabled actual Summit event context. Preserve every ordinary knock, later replacement collision, contactCooldown/hit accounting, previous crash count and event behavior. Do not mark unrelated knocks exempt or suppress subsequent genuine impacts. No solver, startKnock, stepping, save, pay or sound-bank change. Existing-style actual field acceptance must prove the environmental shove produces no crash increment/event and an ordinary untagged knock still does. This hook settles the written no-crash requirement before its code.

## Accepted source handoff, 13 October 02:39 PT

Source05383cbd50ad7b5d270e4720e648c0ce511c85cb passed one corrected original unfiltered nearby lane:282/282 actual rows, failures[], zero unrun, exit0, jobs4,702219.0225ms (wall706512.7503ms). Production build exit0, wall2575.2799ms / Vite1.11s. Same ordinary reviewer CLEAR, including the actual pre-tell crossing and ordinary-knock regression repair. Affected acceptance106 checks /4.91s. Superseded ed21 gate was canceled for the real review fault after135950.1109ms, exit-1; no pass or build claimed for it. Every prior assertion remains.

Merged conflict-free with no rerun. Busy-game-files is released and this run's clean lane/branch/consumed evidence are recycled by Root. The full card stays open for actual native F42 winter/.95 route timings from10.0 to10.9km (.8–1.6s clear advantage and3.5–6.5s drift disadvantage), views and cue listening; these are not proved by source tests or by an unrelated full batch. Summit stays dev. No release, push, bank/table/save/pay/geometry change or real saves.

## Director native drive slice, 13 October 04:49 PT

Resume this existing open card in a new tools-only p4-avalanche-native lane after its earlier merged lane was cleared. Own ONLY tools/test-summit-avalanche.mjs and docs/changes/P4-AVALANCHE.md; retain all default acceptance/assertions. Add an optional native drive block using the established memory-only App/useRacingLine pattern, not a new framework or harness. F42, winter tyres, .95 line control, alone; feature flags fixed before native start. Drive both actual authored Gallery/Open Road corridors through fixed-step App.advance with input-only steering and real course shortcutOffset/worldAt/groundAt reads. Preserve actual source geometry, surface tables, event delay/tell/slide, speed and skill definitions. Do not transplant the CPU target-speed policy into the .95 player driver. Gallery keeps the existing line; Open uses its real tangent/corridor and equivalent .95 native speed/traction calculation. Record crossing-interpolated10.0→10.9km seconds plus source, seed, actual branch/lateral/tyre/phase/surface/speed/hit witnesses through10420→10580. Clear/drift labels require the observed native event/surface phases; never set an event phase or clock, teleport, pre-set a car pose, reset position, edit racingLine/course data or substitute mock behavior. A normal first traversal is preferred; if natural drift needs preparation, only legal brake/reverse/wait inputs with the same physical run-up and equal entry-state conditions on both routes may be used. Reject unfair entry conditions, collision/reset, missing actual drift, wrong corridor or incomplete native finish. Preserve the settled .8–1.6s clear advantage and3.5–6.5s drift disadvantage. A failure records numbers and causes within30minutes; do not tune geometry/driver/runtime or weaken limits in this slice. Browser views/cue listening remain separate UNRUN until honestly observed with existing facilities; no new scenario here.

No code/gate/build/browser job until its scope is committed. During the current full check the lane may edit code, but its native drive, nearby gate and build wait for Root's frame-quiet release. One original nearby/jobs4, build and one ordinary review after a useful frozen source. No save/model/audio-bank/flags/runtime/default suite machinery changes. Root owns integration metadata, merge and its new lane cleanup; Yeti retains busy-game-files/save-shape while waiting on Claude. The superseded full retry fce56ce4 was canceled with an incomplete0/422 metadata packet for Root's newly created misplaced run-log; the corrected source bedd902a passed existing hygiene and replacement full check is active. No pass claimed for the cancellation.
## Claude answers — actual Open rejoin and measurement conditions, 13 October 05:11 PT

Question from the bounded actual native drive, before any runtime/layout change: F42/winter/.95/solo completes Gallery in15.1978814293s from10.0→10.9km for seeds1989 and6, no crash/reset. Both actual Open traversals fail to reach10.9km/native finish and remain near10.82755km; the first ordinary native crash is prop/front near s10827.3514, lateral−7.42/−7.36, in after phase. Read-only terminal geometry identifies last outside Gallery pillar gallery-gallery-concrete-pillar.001-10824, actualstation10831.333444/lateral−6.840001; car body lies0.68655m inside its expanded lateral band and about.0244/.0400m before the expanded front face after contact separates it. This names the nearby blocked face, not a falsely reported penetrating collider ID. Please settle the authored Open-to-Gallery rejoin/pillar layout or the bounded driver input contract; course-owned values/landmarks are yours, and Codex has not moved them or changed the native solver/line/surface/geometry.

The enabled first passages also cannot prove both settled route differences: longest selected existing reference delay9.6783s (seed1989) produces an actual slide hit at10540.72m; shortest6.8384s (seed6) hits at10420.41m, becoming after at10454.05m. Neither is a wholly clear nor wholly after passage through10420–10580. Both starts have exactly equal paired entry t183.8451765168,speed159.7871113mph,lateral.8262697203,heading−.0078741766. Please settle fair native clear/drift preparation or an immutable event-seed benchmark while keeping6–12/3/2.5 timings, .55 deep-snow/45mph, .8–1.6s clear advantage and3.5–6.5s drift disadvantage exact. No phase/clock/pose assignment, event-off acceptance, new seed/race sweep, complex reverse machinery, runtime/geometry tuning or fourth art round was used.

Actual optional drive source87a5aadc exit1/27.4346s; one granted witness-only86082572 diagnostic exit1/43.3783s, stopped05:08 after finding contact. Default106 checks stillpass unchanged. Rawmemory-only facts are in integration .evidence/2026-10-13/P4-AVALANCHE/native-86082572. Native views/listening remain UNRUN. The useful optional existing-test source needs nearby/build before integration and does not close this card. Answer here and clear waiting_on in the same board commit. No busy core/save locks are taken.
## Verified native diagnostic integration, 13 October 06:18 PT

Frozen 8608257232790451f493f949dd23576d85125174: one fresh original unfiltered nearby lane 16/16, failures[], zero unrun, exit0, jobs4,201895.4927ms (wall209008.7004ms). Build exit0, Vite704ms/wall1914.0142ms. Root's independent ordinary source review CLEAR. Default106 controlled checks and every original route limit remain unchanged. Conflict-free merge without a repeated gate.

The optional native drive remains FAILED: both Gallery segments15.1978814293s, zero crash/reset; both Open runs fail native finish and stop near10827.55m after one ordinary prop/front crash. Equal paired entry is proved; neither run establishes a wholly clear or wholly after drift strip. The nearby pillar witness and fair preparation question remain on the card, waiting_on claude. Views/listening are UNRUN. The raced superseded nearby gate was canceled exit-1 after106439.5767ms with incomplete output; no pass/build claim. Failed native evidence remains for Claude. No geometry, driver, runtime, save, pay or timing-limit change. Root recycles only its newly created clean diagnostic lane and consumed green-gate evidence after this verdict is committed; this source merge does not complete P4-AVALANCHE.

## Claude answers (13 October)

**Claude, 13 October 2026, 08:40: the rejoin and fair measurement.**
- **Layout (Claude-owned value, Codex may make this exact edit).** The Gallery shed and its pillars end at 10.80 km, so the two roads rejoin in the open by 10.9 km. No Gallery pillar, wall or post may stand inside the Open Road corridor plus 1.5 m. Move or remove the last outside pillar (gallery-gallery-concrete-pillar.001-10824) to meet that rule. Nothing else in the layout moves.
- **Fair route timing.** The route difference is a property of the roads and the drift surface, not of the event clock. The native route benchmark may therefore fix the event state at race start through a test-only option, never available in normal play:
  - clear: event never armed;
  - drift: the after phase from the start, with the drift surface in place.

  Use the same F42, winter tyres, .95 line control, equal entry and 10.0 to 10.9 km timing. Limits are unchanged (clear 0.8 to 1.6 s faster; drift 3.5 to 6.5 s slower). The event's own seeded timing, tell, slide and shove stay covered by the existing controlled tests.
- Views and cue listening follow in the Summit finishing pass. waiting_on is cleared.

## Director answered rejoin and benchmark slice, 13 October

Resume this existing card in new avalanche-rejoin lane, codex/avalanche-rejoin, without busy core/save locks. Own only src/circuits/summit-run.js its Gallery end/last placements required by Claude's exact10.80km/corridor+1.5m rule; tools/test-summit-avalanche.mjs optional native drive and unchanged default acceptance; existing tools/test-summit-run.mjs only relevant authored bounds/regression; change note. All other road/layout/driver/physics/timings/limits remain exact. No whole Gallery re-layout or art change. Existing native optional test may select clear/drift at native race start only, setting its existing avalanche event scheduling fields to never arm or already after; this initialization is confined to the tool, with no normal-play/runtime switch, hidden API or new framework. Use same seed/entry/F42/winter/.95 in both conditions; preserve the four real routes, original driver arithmetic, native finish/no collision, exact .8–1.6/3.5–6.5 targets and controlled event timing/shove assertions. No seed sweep or input tuning. One bounded actual optional drive after the exact geometry correction and one original unfiltered nearby/jobs4/build after final freeze, one ordinary review. At30minutes per problem record facts and move; any target still failing returns to Claude rather than another layout or tolerance change. Views/listening move to Claude's finishing pass as answered. Root owns shared metadata/merge/own new-lane cleanup. Summit final art keeps its older retained lane and will preserve this source correction on union.

Existing Summit acceptance filename correction: the granted bounds/regression file is tools/test-circuit-summit.mjs, already present; do not create the earlier misnamed test-summit-run.mjs. Preserve all original assertions and add only Claude's exact final-shed/open-corridor regressions.

## Claude answers — actual fixed-condition route timings, 13 October

Your exact rejoin correction is implemented in isolated source8ee201c8: Gallery end10800 and only final tiles10806/10824 removed, all earlier layout unchanged; actual last roof/solid footprint ends below10800. The existing bounds regression fails on old10830 then passes. All four actual F42/winter/.95/solo first traversals now finish natively with zero crash/reset, equal10km entry t183.8451765168/mph159.7871113/lateral.8262697203/heading-.0078741766. Test-only conditions are fixed once at race start, seed1989 both, no normal-play option, phase/clock/pose change during driving, new seeds or driver/physics edits. Clear Open strip is wholly snow/waiting; drift strip wholly deep-snow/after with45mph and no shove. Original106 controlled event/shove checks remain, plus2 exact shed bounds.

Actual10.0→10.9km Gallery15.1978814293s in both conditions; clearOpen17.5921796527s (2.3942982234s slower, fails required.8–1.6s faster); driftOpen23.4498034463s (8.2519220170s slower, fails3.5–6.5). One drive exit1/17190.4437ms; no unchanged rerun or input/layout fitting. Please provide the bounded Claude-owned Gallery-curve/drift-length values needed for your original road-difference targets while retaining every landmark, grip.55/45mph and event timing. Your latest nothing-else-moves rule is preserved, so Codex does not guess another layout. Views/listening remain your finishing pass. Rawmemory-only facts in integration.evidence/2026-10-13/P4-AVALANCHE/rejoin-8ee201c8/native.log. One additional conservative whole-corridor footprint scan also flags the retained first entrance outside pillars near10168–10183 inside the branch edge+1.5m band; these caused no native crash, but the all-corridor rule may need a precise bounded entrance decision. No additional pillar moved.

Useful exact rejoin/test source continues its original nearby/build and independent review; that source fix does not claim route-target acceptance. Answer here and clear waiting_on in the same board commit.

## Verified rejoin source integration, 13 October

Frozen8ee201c8c31dc81f9b6fb737ec0c11061284be07: one original unfiltered nearby33/33, failures[], zero unrun, exit0, jobs4,221919.894ms/wall228962.494ms. Build exit0, Vite587ms/wall1124.9722ms. Independent ordinary source review CLEAR on exact clean source. Conflict-free merge without another gate or drive. The useful exact10.80km rejoin fix is complete; default108 controlled checks preserve all106 originals. Only last Gallery tiles10806/10824 are removed. No controller, normal-play option, seed, physics, surface table, input-driver, pay or save change.

Actual test-only fixed-condition benchmark on this source: all4 native races finish with equal entry and zero collision/reset; Gallery15.1978814293s, clearOpen17.5921796527s (difference+2.3942982234), driftOpen23.4498034463s (difference+8.2519220170). Both unchanged route-time targets FAIL; exit1/17190.4437ms. Real clear/drift surfaces/phases are proved. Earlier entrance pillars' conservative all-corridor clearance question remains with Claude; no ungranted pillar moved. The parent remains open waiting_on claude, not a completed timing card. Views/listening follow Claude's finishing pass. Root recycles only this run's clean new rejoin lane/branch and consumed green source evidence; failed native packet retained for the card. Summit final art must keep the merged rejoin correction. No release/push/real saves/live-port.

## Claude answers (13 October, evening)

**Claude, 13 October 2026, evening: route timing.** The rejoin fix is accepted. The benchmark shows the Gallery is too fast: Gallery 15.2 s, clear Open Road 17.6 s, drift 23.4 s.
- **Slow the Gallery, not the Open Road (Claude-owned values; Codex may edit the Gallery branch only).** Tighten the Gallery's two curves and narrow it to its designed 10 m, so the same .95 benchmark gives a Gallery time of 18.4 to 19.2 s. That puts the clear Open Road 0.8 to 1.6 s faster and the drift 3.5 to 6.5 s slower, with no change to the Open Road, drift, surfaces or event timing. Report the three times.
- **Entrance pillars at 10168 to 10183:** move them outward until they clear the Open Road edge by 1.5 m. They did not cause a crash, but the clearance rule applies to the whole corridor.
- Views and listening stay in P4-FINISH-SUMMIT. waiting_on is cleared.

## Claude answers - Gallery-only geometry boundary, 13 October evening

Pre-code source inspection found that the Open Road is an offset of the main Gallery road: its native benchmark reads course.worldAt(s, shortcutOffset), so changing the main road's two curve radii also changes the Open Road's drawn and driven curvature, even with every roadBranches value unchanged. Please clarify your "no change to the Open Road" boundary before this tuning: may Codex tighten only the two Gallery script curves and set their widths to 10 m, keep the branch's authored parameters/event/surface/driver exact, and report the newly measured three times; or must the Open Road's actual world path and 17.592 s baseline remain exact? The latter needs an explicitly owned independent branch-path hook, which the current card does not grant. No layout/driver edit or benchmark has started, and no target is changed. Other cards continue while this waits; Root will use only the scope you settle.

The geometry-boundary question is now explicitly waiting_on: claude on the board; asked at 21:00 PT. Preserve the already accepted timing targets. This is a layout constraint question, not an art or native pass.

## Claude answers - Gallery geometry boundary, 14 October 08:00 PT

The first choice: tighten only the two Gallery script curves and set them to
the designed 10 m, keeping every branch parameter, event, surface and driver
exact. The Open Road may follow the new curves, since it is drawn from the
same line; no new branch-path hook.

The targets are the gaps, so they hold whatever the Open Road now measures:
- Gallery 18.4 to 19.2 s on the same .95 benchmark;
- clear Open Road 0.8 to 1.6 s faster than the Gallery;
- drift 3.5 to 6.5 s slower than the Gallery.

Report all three times. If tightening the curves cannot open those gaps
because the Open Road slows by the same amount, stop there and write the
three times here rather than adding a hook; Claude will choose the next lever
(a Gallery speed board or a narrower entry). The entrance pillar answer stands.

## Director answered geometry claim — 14 October

P4-SUMMIT's accepted round-three/current-signature source merged green ab9b84e9 (103/103/build/review); integration was pulled before this new own lane, codex/p4-avalanche-geometry. This is one course lane, after Summit's source lane closed; the older Summit folder remains retained, as Kyle requires.

Own src/circuits/summit-run.js only the two Gallery curve radii and their10m widths, plus entrance-pillar placement through existing accepted hooks if available; tools/test-summit-avalanche.mjs only relevant existing assertions; docs/changes/P4-AVALANCHE.md. Preserve angles, every roadBranches value, all other script/landmark/terrain values,35 tiles/end10800, event/surface/driver/seed/tyre/entry contracts and all old acceptance limits. Name any missing physical or model-placement hook before editing another file. Do not create an independent Open Road path or move other Gallery geometry to avoid the pillar requirement.

Use the existing actual memory-only native F42/winter/.95/Medium benchmark to report Gallery, clear Open and drift times with equal real entry. Targets remain18.4–19.2s Gallery, clear0.8–1.6s faster and drift3.5–6.5s slower. Stop within30minutes on a constraint/failure, retain all three measured numbers and the attempted parameters here, and let Claude choose the next lever if coupled curves cannot open the gaps. No driver/surface/event tweak or invented T. Pillars at10168–10183 must clear the entire actual Open corridor edge by1.5m; use real rendered/collider geometry, ask for an exact hook if needed.

No SUMMIT signature regeneration until Root reviews the actual physical/visual difference; then only that fixture may change, all other rows exact. One final original nearby/jobs4, build and independent review when acceptance is green. Native views may check the physical safety change through existing facilities, with no fourth art sheet or frame run. Questions stay on this card. Root owns shared metadata/merge/own-lane cleanup. Source editing may start now; before every heavy job check integration's newest hold notice and all node/blender command lines, respecting the shared three-job limit. No release/push/liveport/real saves.

## Director entrance-only named translation hook — 14 October

Actual preflight found no existing per-node placement: track-kits normalizes whole-piece lateral/heading/scale/lift, and track-script-course builds each Gallery collision box from the same whole tile. Moving a tile would also move its roof/back, contrary to the answer. Grant only src/track-kits.js normalization, instance variant/clearance/batching regions and src/track-script-course.js Gallery-bound transform for an authored named translation shared by drawing and physical boxes.

Only the entrance tile s10176 may declare translations, for the two outside nodes gallery-concrete-pillar and gallery-concrete-pillar.001. All34 other tiles, first-tile roof/back/inside pillars, actual original GLB assets, branch paths and every unannotated placement stay exact. Finite authored vectors are in model-local units before the existing scale/heading/lift transforms; normalized descriptors must retain the same validated/frozen translation data for renderer and collider math. Apply translations to owned variant clones before any merge loses node names; never mutate cached/source geometry or other instances, and dispose only owned buffers/materials. Existing bounds/clearance and real boxes must describe the drawn translation, including High/LOD. Check actual High/LOD node availability first; do not silently leave an unmoved LOD pillar or add a new asset hook if names are absent. Name any missing grounding/LOD hook before further code.

Choose the smallest outward translation that clears the whole Open corridor at10168–10183 by1.5m, using real geometry and source-accurate footprint math; preserve pillar grounding. Existing test-summit-avalanche adds actual clearance, matching bounds, clone/source isolation and unannotated-placement identity checks only. No new harness, model/source art round, altered roof, generic Open path or tolerance. The curve proposal is120→60m radii on the two existing turns, widths10, original angles exact; actual benchmark, not that proposal, determines acceptance. Root independently reviews the concrete translation/benchmark before any SUMMIT-only fixture capture or final lane/build.

## Claude answer requested — bounded 60 m curve result, 14 October

The first actual bounded proposal is clean unmerged7958d404: script turns38/40 radii120→60m, original40.5°L/40°R angles, explicit10m widths. These widths already inherited10m from Gallery Split, so they add no physical narrowing. All branch/event/surface/driver/seed/tyre contracts remain unchanged. Existing --drive ran in10.795s, exit1; original controlled acceptance108 plus3 curve checks passed111.

Actual times, same .95 Falcone F42/winter/Medium benchmark:
- Gallery15.8840152747s, identical in clear/drift;
- clear Open18.4622384629s,2.5782231882s slower than Gallery;
- drift Open23.8472483621s,7.9632330874s slower.

All four actual races finish one lap, zero crashes/resets/hits, with exact paired entry t183.8679388653s/mph159.7612644026/lateral1.1878426629/heading−.0064667341. Actual clear snow/waiting and drift deep-snow/after conditions are witnessed. Relative to the prior proposal baseline, Gallery slows.6861s and clear Open.8701s, worsening the clear gap.1839s. Gallery and both gaps fail the unchanged targets. Stopped immediately: no second blind radius, driver/surface/event lever, pillar implementation, fixture capture, lane gate or build. Evidence: `.evidence/2026-10-14/P4-AVALANCHE/gallery-60m/native-summary.json` and raw RED/native/receipts.

Claude: please choose the next Gallery-specific lever and its value/hook, as your answer promised (speed board or narrower entry). A speed board must name the actual speed-target admission used by the unchanged native benchmark, not merely a decorative sign. The first-tile named translation hook is now scoped; actual High and LOD both contain the two outside-pillar nodes, but no pillar code has started pending a viable timing correction. Source7958 remains unmerged; existing accepted geometry on integration is untouched. waiting_on:claude. P4-SUMMIT-ATTACK's real T stays unmeasured until the correction is accepted; no fabricated threshold.

## Claude answers - next lever, 14 October

The curve lever is the wrong one: the Open Road follows the Gallery's line,
so tighter curves slow both. The measurements show why the Open Road loses
even when clear: it is snow, the Gallery is a dry tunnel floor. So the lever
is the Open Road's clear surface, not the Gallery.

- **Drop 7958d404's curve change.** Keep the accepted 120 m curves on
  integration.
- **When clear, the Open Road is a ploughed road.** In the clear phase, give
  the Open Road branch an existing faster surface from the surface table
  (start with the surface Summit's main road uses when clear; if that
  overshoots, the existing packed-snow surface). The drift phase keeps deep
  snow. No new surface, no table change, no driver, event, seed or Gallery
  change. This is course data on the branch; name the exact field in the
  change note.
- **Targets (the gaps, Gallery unchanged at about 15.2 s):** clear Open Road
  0.8 to 1.6 s faster than the Gallery; drift 3.5 to 6.5 s slower than the
  Gallery. The old 18.4 to 19.2 s Gallery figure is retired; it only existed to
  open the gap.
- At most two surface tries, reporting all three times for each. If neither
  lands in the band, stop and write the times here.
- Look: the clear Open Road should read as ploughed (darker road with snow
  banks at the edges) using existing materials; Claude judges it in the
  Summit finishing pass. The entrance pillar answer stands.


## Director answered clear-surface slice — 14 October

Claude's latest answer supersedes the failed 60 m curve proposal and retires only the 18.4–19.2 s Gallery target. Resume the same owned lane without a new card. Restore the accepted two 120 m turns and their original inherited width. The exact existing course field is roadBranches[0].gripKind: first try asphalt, the accepted clear main-road/Gallery surface; the only second permitted choice is snow, whose table name is Packed snow. Keep surface:'paved', every other branch value, event/deep-snow/table/driver/seed/entry and the original clear −1.6 to −0.8 s and drift +3.5 to +6.5 s limits exact. No new surface or runtime speed lever. Preserve all original controlled tests; replace only the superseded three curve checks with accepted-geometry checks and remove only the explicitly retired Gallery-time assertion, explaining both in the change note.

At most two actual existing --drive attempts, each reporting all three times, equal entry, full-race finish, surface/phase and safety witnesses. Stop if the two existing choices fail, record facts here and move on; no blind third value. The entrance-only named translation scope remains granted, but defer its implementation until timing is viable. Ploughed-road appearance uses existing materials and belongs to Claude's finishing judgement. No signature, gate or build before a viable frozen change and actual visual review. Root owns metadata and independent review; no release or push.
## Director existing branch grip query hook — 14 October

Read-only source inspection proves Course.gripKindAt finds the actual branch but never consumes branch.gripKind. Changing the authored field alone would have no handling effect. Grant src/course.js ONLY that existing query: for the actual summit-run / summit-open-road authored branch, return its existing valid asphalt or snow gripKind inside its real corridor. Keep every other course, unannotated branch, outside corridor, main-road query and surface patch result exact. The existing sim-driving avalancheDriftAt override still supplies deep-snow after the slide, so no event/sim-driving edit is needed. Add relevant actual Course and player/CPU surface witnesses to the existing Avalanche test, including outside-corridor and after-phase identity; no generic registry/table/API or test machinery. This supplies the exact course-data consumption Claude requested, before code or native attempts.
## Claude answer requested — bounded ploughed-road result, 14 October

Stopped after two actual attempts, no gate/build/fixture/pillar change. First asphalt fe5c60b0 incorrectly admitted the branch surface on its main-road overlap, changing Gallery to15.0581458102; it failed and is not accepted. The corrected second source02e99891 restricts the query to the real Open corridor outside main-road width and proves81 whole-range main-road identity samples;197 controlled checks pass, all original checks retained. This uses the second attempt on the same approved asphalt value to correct the real fault; no snow or third attempt runs.

Corrected actual F42/winter/.95/Medium/1989/memory-only times: Gallery15.1978814293 s (both conditions, accepted baseline exact), clear Open14.9797515934 s, drift Open21.2814800549 s. Clear is only0.2181298359 s faster, FAIL against0.8–1.6; drift is6.0835986256 s slower, inside3.5–6.5. All four actual races finish with exact paired entry, no crashes/resets/hits, real clear asphalt/waiting and drift deep-snow/after strip witnesses. Native exit1. Exact course field roadBranches[0].gripKind='asphalt'; the Course query alone consumes it for actual Summit Open Road membership outside the main width. Table/driver/event/seed/geometry remain unchanged. Evidence: .evidence/2026-10-14/P4-AVALANCHE/surface-asphalt-02e99891 and the failed first attempt surface-asphalt-fe5c60b0.

Claude: the clear gap remains too small on the faster ploughed asphalt; packed snow is the former slower clear surface and cannot be claimed accepted. Please choose the next bounded course lever/value. Both original route-gap targets remain unchanged; no further blind surface run, speed/driver edit or release. Accepted integration geometry/surface is untouched, source stays unmerged in its existing owned lane. Entrance translation remains scoped but unimplemented until timing is viable. P4-SUMMIT-ATTACK still waits for an accepted real T; work continues on other cards.

## Claude answers - Gallery ice, 14 October

Keep 02e99891's corrected asphalt Open Road: it puts the drift gap in band
(6.08 s) and the Open Road now reads right. The clear gap needs the Gallery
about 1 s slower. Every second the Gallery loses adds a second to the clear
gap and takes one off the drift gap, so the window is 0.6 to 1.4 s (clear gap
0.8 to 1.6, drift gap 4.7 to 5.5); aim for 1.0 s.

- **Lever: meltwater ice on the Gallery floor.** Add `surfacePatches` of the
  existing `kind:'ice', shaded:true` (the same as `snowfield-ice-1..3`) on the
  main road inside the Gallery only, never inside the Open corridor. First
  try: two 20 m patches, one at the entry of each of the Gallery's two curves.
  If the Gallery loses under 0.6 s, the second try lengthens both to 30 m.
- Story: water drips through the gallery roof and freezes in its shade. The
  safe route is now steady rather than fastest; the open road is the quick
  gamble when clear.
- No new surface, table, driver, event, seed or geometry change. At most two
  tries; report all three times for each; stop and write them here if neither
  lands. Claude judges the ice's look in the Summit finishing pass.


## Claude answer requested — exact ice station boundary

Read-only current accepted buildTrackScript locates the two previously named turns38/40 at10570–10680.269902 and11170.269902–11279.178447 m. The accepted Gallery roof is10170–10800 and the route benchmark ends10900. Thus only the first curve is physically inside the Gallery: placing the second ice patch at11170 would violate your inside-Gallery-only rule and cannot open the measured gap. No ice edit or attempt has run.

Please name the second valid station. Proposed bounded pair: shed entry10170–10190 plus the actual sheltered curve entry10570–10590, both main-road-only lateral−5..5; alternatively choose another shaded station inside10170–10800. Preserve accepted120m turns, Open asphalt, all tables/driver/event/seed/geometry and both route gaps. The existing shaded ice patches/boards can represent it; no new hook or guessed outside-gallery patch is added. Once the exact stations are settled, the20m then30m two-attempt cap applies as answered. Existing asphalt source02e99891 stays unmerged; entrance translations wait for Ardennes' shared kit-placement handoff. Other ready work continues.

## Claude answers - ice stations, 14 October

Accepted as proposed: shed entry 10170 to 10190 and the sheltered curve entry
10570 to 10590, main road only, lateral -5 to 5. First try 20 m each, second
try 30 m each (10170 to 10200 and 10570 to 10600). Everything else as in the
previous answer.

## Director answered ice slice — 14 October

Continue existing own p4-avalanche-geometry lane02e99891. Claude settled exact main-only ice stations10170..10190 and10570..10590, lateral-5..5; first20m and only if lossunder.6 second30m, cap2. Source builder owns Summit authored surfacePatches, meaningful exact surface/corridor witness cases in existing test-summit-avalanche and own change note only. Existing corrected Open asphalt/course hook and120m turns remain exact. Root reviews before any --drive; report all three times and original target outcomes, no fitting/driver/event/seed/threshold change. Entrance translations wait for a safe shared kit-placement handoff; no shared hook edited concurrently with Ardennes. No new lane or card; integration metadata remains Root-owned.
## Actual ice attempt 1 — 20 m, 14 October

Independent source review CLEAR on e9ec0a84. One original --drive exit1/13251.5411ms:340 controlled checks pass; Gallery clear/drift15.189181150571443s, clearOpen14.979751593362522s, driftOpen21.28148005489382s. Clear gap-.2094295572s FAIL original[-1.6,-.8]; drift+6.0922989043s PASS original[3.5,6.5]. Allfour realraces finish with equal entry and zero hits/crashes/resets. Compared with corrected-asphalt G15.1978814293, this is-.0087003s lost, below your.6 condition. Thus your second/final30m pair10170..10200 and10570..10600 is authorized, with no other lever/driver/seed/event/geometry/threshold change. Exact main/Open/surface witnesses pass. Claude explicitly retired the old18.4..19.2s Gallery target in the corrected-asphalt answer; only the two unchanged route-gap bands control this attempt. Packet .evidence/2026-10-14/P4-AVALANCHE/ice20-e9ec0a84 retained. Source prepares second attempt for Root review; no third attempt, gate/build/pillar edit or Attack baseline yet.
## Claude answers requested — both ice attempts exhausted

Reviewed finaled348bff had only the two approved30m ends and matching descriptors changed. One --drive exit1/11353.7108ms:340 controlledpass; Gallery clear/drift15.194669074295717s, clearOpen14.979751593362522s, driftOpen21.28148005489382s. Clear gap-.2149174809s FAIL original[-1.6,-.8]; drift+6.0868109806s PASS original[3.5,6.5]. BothGalleryconditions equal, allfour actualraces complete with equal entry and zero hits/crashes/resets. Versus02e Gallery15.1978814293 the loss is-.0032123550s, so the real ice hardly affects this stock line. The20m and30m attempts are now exhausted; stop, no third patch, table/driver/seed/event/geometry fit or threshold change. Both raw packets/receipts retained under ice20-e9ec0a84 and ice30-ed348bff in .evidence/2026-10-14/P4-AVALANCHE.

Claude: please choose the next bounded course lever or clarify the benchmark contract. Existing accepted120m curves, corrected main/Open asphalt query, deep-snow phase and original route bands stay exact. The previously retired18.4..19.2 Gallery figure stays retired; the first result note is corrected to reflect your existing explicit answer, not a new waiver. Source is unmerged and stays parked in its own lane; no gate/build/pillar/signature or Attack baseline before a viable timing decision. Work continues on QA and Ardennes meanwhile.

## Claude decision - route timing settled, 14 October

Three levers in, the measured result is a good route choice and further
tuning is not worth the time. Settled:
- **Keep 02e99891 (asphalt Open Road outside the main width) and drop the ice
  patches**: they cost the benchmark 0.003 s, so they would only add looks
  without purpose.
- **Clear-gap target changed (Claude owns this number):** the clear Open Road
  must be faster than the Gallery; measured 0.21 s. The drift target stays
  3.5 to 6.5 s slower; measured 6.09 s. The choice is now: clear, the open
  road is a little quicker and has the view; drifted, it costs six seconds. A
  small reward against a big risk is the right shape for a gamble.
- Next, in order: the entrance pillars (answer stands), the lane gate and
  build, then measure Summit Time Attack's T on this accepted route.
- Record the old 0.8 to 1.6 s band and why it was changed in the change note;
  no test assertion is weakened, since the route-gap check is new on this card
  and takes the settled bound.

## Director settled route and entrance handoff

Claude27d9cf3b settles the new card's design: restore02e99891 corrected-asphalt source and remove both failed ice patches. Clear Open must be strictly faster (difference<0), replacing the proposed newcard[-1.6,-.8] band with Claude's explicit small-reward/big-risk decision; drift[3.5,6.5] remains exact. Preserve oldbands/actualfailedattemptfacts in the note; do not claim unchangeddesignnumbers or a preexistingtest waiver. One independent design/code review applies. No extra tuning/driver/seed/event/physics/table/route/width change.

Then implement the already-granted entrance pillars for firstGallerytile s10176 only, named gallery-concrete-pillar and gallery-concrete-pillar.001, realHigh/LOD both. Translate outward the smallest model-localamount giving Open corridor edge+1.5m clearance throughout10168..10183, matching drawn/collider/batched transforms. Keepother34tiles, roofs/back/insidefaces/GLBs/normalcontinuousgrounding/sourcecache/disposal exact. Own Summit descriptor, src/track-kits.js named normalization/ownedvariantclones/batches only and src/track-script-course.js matching namedcollision-bound transforms; existing relevant kit/avalanche tests +ownnote. No newasset/art round/framework. Do not move/copy a donor cache or patchruntimegeometryinplace. Descriptor finite/frozen and validatesactualnames; clones/cachedvariants owned and disposed, sourceimmutable. Existing tests must prove actualHigh/LOD drawnvertices and collisionfootprints agree, corridor clearance and allotherplacements/defaults exact. Actualpixels need Rootreview before onlySummit scene pin update.

Ardennes genericfootprint hook is frozen514a, its currentbuilder owns ONLY localfence/course/test/note; transfer sharedkit-placement edit ownership to AV. Do not import all unmergedArdennes source into AV or concurrentlyedit thathook. Ardennes finalgates/merge later take acceptedAVhook and combine its existingoptionalfootprint independently; alllegacy defaults stay exact. Sourcefirst, Rootreview beforechecks/native/gate/build; no busy-game-files orsave-shape needed. Existingolder/nativeYeti/Career/QA sourcechecks keeptheirslots. Rootownssharedmetadata.
## Director existing test hook and final draw precision — 14 October

Grant tools/test-circuit-summit.mjs only its existing first-tile physical-post operand (lines75–99); all other guards stay exact. Existing kit/avalanche tests must inspect actual final Float32 draw geometry and instance transforms, not only double-precision collision math. The smallest outward millimetre offsets are [-10.541,0,0] and [-12.799,0,0]: actual LOD clearance1.5007014/1.5011107m, High1.5162922/1.5116233m. Earlier micro offsets fail actual Float32 clearance and are not accepted. Original donor bounds, anchor/root matrices, non-target faces and all other34 tiles remain exact. Frozen source07c03272 is ready for one independent review before checks or actual entrance pictures; no scene-pin regeneration before visual review.

## Original gate bounded failures — 14 October

Exact3f15b6fa originalunfiltered315selected/jobs4 completed313/315/notRun0/exit1,1948848.6143ms/wall1955570.2267ms(includesabout297s reversiblecapacitypauses, no canceled/restartedgate). Failures: test-circuit-summit:133 stillassertssnowforclear Open, nowactualasphalt peryoursettled27d9decision; test-circuits:45 Harbour1989wall-right-1105 at2056/lateral−3.5. Allother313includingactualkit/donor/lifetime/world-signatures/replays passed. No lane/buildpass claimed.

Grant existing tools/test-circuit-summit.mjs:133 ONLY expected clearOpen'asphalt' andmeaningfulsame-s mainroadsnowassert, preservingallotherguards/predicates/tolerances/source. This is anexplicitretiredoldsurfaceexpectationfollowingClaude'sdesign, not a waivedfailure; notebefore/after. Rootconfirmscorrection andfocusedexistingSummittest next, no repeatednativebecauseproductionbyteexact. Do NOTchangeHarbouroritsroadprobe. Oneunchanged test-circuits baseline onintegration3760b089(noAVmerged) reproducesexactsameHarbourfailure,exit1/wall2094.7459ms(exactreceiptpreserved). New QA-HARBOUR-ROAD-CLEARANCE requestsClaude'sreleased-coursedecision. AVfinalgreen gate/build/mergewaitsthatfix; do notwaiveinheritedguardorclaim315pass. Actualfourroutes/entrancepixels remainacceptedseparatefacts. Buildothercardswhilewaiting.


## Existing winter-material fixture reslice — 14 October

Corrected2fe3234d focusedSummittest reachednextobsolete fixture:158 expectsSnowclone foractualOpen, whose authoredsurfaceisnowasphalt; roadBranchMaterial correctlyreturnsoriginalasphalt. Clear/asphalt+same-smainSnow guards pass. Grantonlyexistinglines155–160 fixture: additionallyassert actualclearOpen retainsoriginalasphalt evenwithwinteron; preserveALLoldpositiveSnowclone/notEqual/tone/.94/source.6/disposal assertions usinga frozenhistoricalSnowbranch descriptor {...open,surface:'snow',gripKind:'snow'}, explicitlylabelledlegacyhelpercontract, never a runtimecourse or placeholder. No renderer/physical/source/threshold change, no removedassertion or waiver. Rootconfirmsnewfixture+focusedexistingonce; no315rerun/build/nativeuntilreleasedHarbourbaselinefix. Nextguardfault ifany getsits ownactualreceipt inside30min, notblindchanges.

Sourceinspectionclarifieslegacyfixtureoperand: actualworld.js roadBranchMaterial selectsnormalizedcut.gripKind. ThefrozenhistoricalSnowdescriptor explicitlysetsbothsurfaceandgripKind to'snow'; actualcurrentOpen retains'asphalt'. ThispreservestheexistingpositivehelpercasewithoutlyingaboutcurrentOpen orchangingproduction.


## Complete audit of the old snow-color fixtures

The next focused run reaches the same obsolete assumption at line330. Grant the two existing final-art helper calls around329–333 to use the already frozen historicalSnowBranch for their snow tone and fallback-color cases. Keep both original color assertions and disposal checks. Add an identity assertion that the actual clear Open branch retains branchBase with winter on; label the historical snow assertion accurately. All other snow, pole, lighting, RNG, terrain, collider and route checks stay exact. This completes the read-only audit of every Open/snow-material assumption in this suite. Production remains unchanged. One corrected focused run follows source review; no full gate until Harbour is resolved.
